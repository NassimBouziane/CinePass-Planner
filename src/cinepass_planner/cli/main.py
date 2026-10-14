import random
import time
import typer
from datetime import date, datetime, timedelta
from typing import Optional
from rich.console import Console
from rich.table import Table
from rich.panel import Panel

from cinepass_planner.db.connection import get_db_connection
from cinepass_planner.db.schema import init_db
from cinepass_planner.db.repositories import CinemaRepository, ShowtimeRepository
from cinepass_planner.importer.allocine_client import AllocineRateLimitError
from cinepass_planner.importer.sync_service import SyncService
from cinepass_planner.core.scheduler import Scheduler, PlanCriteria
from cinepass_planner.models import PassType

app = typer.Typer(
    name="cinepass",
    help="CinéPass Planner - Organisateur de marathons cinéma pour abonnés Pathé CinéPass"
)
console = Console()

def ensure_initialized():
    conn = get_db_connection()
    init_db(conn)
    return conn

@app.command()
def cinemas(
    city: Optional[str] = typer.Option(None, "--city", "-c", help="Filtrer par ville/agglomération (ex: Paris, Lyon)")
):
    """Lister tous les cinémas éligibles au CinéPass en base de données."""
    conn = ensure_initialized()
    repo = CinemaRepository(conn)
    all_cinemas = repo.list_all(city)

    if not all_cinemas:
        console.print("[yellow]Aucun cinéma trouvé en base de données.[/yellow]")
        console.print("Astuce : Lancez le script d'initialisation pour importer le réseau : [bold]uv run python scripts/seed_database.py[/bold]")
        return

    table = Table(title="🎬 Cinémas éligibles au Pathé CinéPass", show_header=True, header_style="bold gold1")
    table.add_column("ID Allociné", style="cyan", width=12)
    table.add_column("Nom du cinéma", style="bold white", no_wrap=True)
    table.add_column("Agglomération", style="green")
    table.add_column("Réseau / Type", style="magenta")
    table.add_column("Formules", style="yellow")

    for c in all_cinemas:
        passes = []
        if c.accepts_gold: passes.append("Gold")
        if c.accepts_silver: passes.append("Silver")
        if c.accepts_under26: passes.append("-26")
        table.add_row(
            c.id,
            c.name,
            c.city,
            c.group_type,
            ", ".join(passes)
        )

    console.print(table)
    console.print(f"[dim]Total : {len(all_cinemas)} cinémas répertoriés.[/dim]")

@app.command()
def sync(
    cinema: str = typer.Option(..., "--cinema", "-c", help="ID ou nom partiel du cinéma à synchroniser"),
    days: int = typer.Option(8, "--days", "-d", help="Nombre de jours de séances à synchroniser (par défaut 8)")
):
    """Synchroniser les séances d'un cinéma depuis Allociné vers SQLite."""
    conn = ensure_initialized()
    cin_repo = CinemaRepository(conn)
    
    # Resolve cinema
    target_cinema = cin_repo.get_by_id(cinema)
    if not target_cinema:
        matches = [c for c in cin_repo.list_all() if cinema.lower() in c.name.lower() or cinema.lower() in c.id.lower()]
        if matches:
            target_cinema = matches[0]
        else:
            console.print(f"[bold red]Cinéma non trouvé :[/bold red] {cinema}")
            return

    console.print(f"[bold cyan]Synchronisation de[/bold cyan] [bold yellow]{target_cinema.name}[/bold yellow] ([dim]{target_cinema.id}[/dim]) sur {days} jours...")
    service = SyncService(conn)
    with console.status("[bold green]Téléchargement des séances..."):
        count = service.sync_cinema(target_cinema.id, days_count=days)

    console.print(f"✅ [bold green]Synchronisation terminée ![/bold green] {count} séances enregistrées.")

@app.command()
def plan(
    cinema: str = typer.Option(..., "--cinema", "-c", help="ID ou nom du cinéma"),
    date_str: str = typer.Option(None, "--date", help="Date de projection (YYYY-MM-DD, par défaut aujourd'hui)"),
    films: int = typer.Option(3, "--films", "-n", help="Nombre de films visés (1 à 5+)"),
    start: str = typer.Option("10:00", "--start", help="Heure de départ au plus tôt (ex: 10:00)"),
    end: str = typer.Option("23:00", "--end", help="Heure de fin maximale (ex: 23:00)"),
    pass_type: str = typer.Option("Gold", "--pass", help="Formule CinéPass (Gold, Silver, -26)"),
    supplements: bool = typer.Option(True, "--supplements/--no-supplements", help="Autoriser les séances à supplément (IMAX, 4DX...)"),
    meal_break: bool = typer.Option(True, "--meal/--no-meal", help="Prévoir une pause repas (déjeuner ou dîner)"),
    buffer: int = typer.Option(15, "--buffer", "-b", help="Marge minimale entre séances en minutes"),
    lang: str = typer.Option("all", "--lang", "-l", help="Langue souhaitée (all, vost, vf)"),
    format_filter: Optional[str] = typer.Option(None, "--format", "-f", help="Format de projection souhaité (ex: Dolby, IMAX, 4DX)")
):
    """Calculer et afficher les meilleures propositions de journée cinéma."""
    conn = ensure_initialized()
    cin_repo = CinemaRepository(conn)
    sht_repo = ShowtimeRepository(conn)

    target_date = date_str or date.today().strftime("%Y-%m-%d")

    # Resolve cinema
    target_cinema = cin_repo.get_by_id(cinema)
    if not target_cinema:
        matches = [c for c in cin_repo.list_all() if cinema.lower() in c.name.lower() or cinema.lower() in c.id.lower()]
        if matches:
            target_cinema = matches[0]
        else:
            console.print(f"[bold red]Cinéma introuvable :[/bold red] {cinema}")
            return

    showtimes = sht_repo.get_showtimes(target_cinema.id, target_date)
    if not showtimes:
        console.print(f"[yellow]Aucune séance en base locale pour [bold]{target_cinema.name}[/bold] le {target_date}.[/yellow]")
        console.print(f"Lancez la synchronisation : [bold]uv run cinepass sync --cinema {target_cinema.id}[/bold]")
        return

    # Map PassType
    p_type = PassType.GOLD
    if "silver" in pass_type.lower():
        p_type = PassType.SILVER
    elif "26" in pass_type.lower():
        p_type = PassType.UNDER26

    selected_formats = [format_filter] if format_filter else []

    criteria = PlanCriteria(
        cinema_id=target_cinema.id,
        date_str=target_date,
        target_films_count=films,
        start_time=start,
        max_end_time=end,
        priority_movies=[],
        pass_type=p_type,
        allow_supplements=supplements,
        min_buffer_minutes=buffer,
        require_meal_break=meal_break,
        language=lang,
        selected_formats=selected_formats
    )

    scheduler = Scheduler()
    plans = scheduler.generate_plans(showtimes, criteria)

    if not plans:
        console.print("[bold red]Aucun enchaînement valide trouvé avec ces critères.[/bold red]")
        console.print("Astuce : élargissez la plage horaire ou désactivez l'obligation de pause repas.")
        return

    console.print(Panel.fit(
        f"[bold gold1]🎟️ CINÉPASS MARATHON PLANNER[/bold gold1]\n"
        f"Cinéma : [bold white]{target_cinema.name}[/bold white] • Date : [cyan]{target_date}[/cyan]\n"
        f"Pass : [bold yellow]{p_type.value}[/bold yellow] • Créneau : {start} ➔ {end} • Films ciblés : {films}",
        border_style="gold1"
    ))

    for idx, itinerary in enumerate(plans, start=1):
        table = Table(
            title=f"Proposition {idx} ({len(itinerary.showtimes)} films • {itinerary.total_movie_minutes // 60}h{itinerary.total_movie_minutes % 60:02d} de film)",
            show_header=True,
            header_style="bold cyan"
        )
        table.add_column("Horaire", style="bold yellow", width=16)
        table.add_column("Film", style="bold white")
        table.add_column("Format & Langue", style="green")
        table.add_column("Transition / Pause", style="magenta")

        for i, st in enumerate(itinerary.showtimes):
            s_start = st.starts_at.split("T")[1][:5]
            s_end = st.ends_at.split("T")[1][:5]
            
            pause_label = ""
            if i < len(itinerary.showtimes) - 1:
                next_start = itinerary.showtimes[i + 1].starts_at.split("T")[1][:5]
                p_min = int((datetime.fromisoformat(itinerary.showtimes[i + 1].starts_at) - datetime.fromisoformat(st.ends_at)).total_seconds() / 60)
                if p_min >= 45:
                    pause_label = f"🥗 Pause repas ({p_min} min)"
                else:
                    pause_label = f"⏱️ Transition ({p_min} min)"

            format_badge = st.format
            if st.format != "Standard" and p_type != PassType.GOLD:
                format_badge += " [yellow](+Supplément)[/yellow]"

            table.add_row(
                f"{s_start} ➔ {s_end}",
                st.movie_title,
                f"{format_badge} • {st.version}",
                pause_label
            )

        console.print(table)
        console.print("")

@app.command(name="sync-all")
def sync_all(
    days: int = typer.Option(8, "--days", "-d", help="Nombre de jours de séances à synchroniser (par défaut 8)"),
    limit: Optional[int] = typer.Option(None, "--limit", help="Limiter à N cinémas pour test"),
    batch_size: Optional[int] = typer.Option(15, "--batch-size", "-b", help="Nombre maximum de cinémas à synchroniser par lot"),
    loop_batches: bool = typer.Option(False, "--loop-batches", help="Enchaîner tous les lots avec pause de sécurité jusqu'à synchronisation complète"),
    batch_pause: float = typer.Option(300.0, "--batch-pause", help="Pause en secondes après chaque lot si loop-batches est activé (défaut: 300s / 5min)"),
    force: bool = typer.Option(False, "--force", help="Forcer la mise à jour même si déjà synchronisé"),
    min_delay: float = typer.Option(0.5, "--min-delay", help="Délai minimal aléatoire (en secondes) entre chaque cinéma"),
    max_delay: float = typer.Option(2.0, "--max-delay", help="Délai maximal aléatoire (en secondes) entre chaque cinéma"),
    delay: Optional[float] = typer.Option(None, "--delay", help="Délai fixe (déprécié, préférer --min-delay et --max-delay)")
):
    """Synchroniser tous les cinémas du réseau CinéPass depuis Allociné."""
    conn = ensure_initialized()
    repo = CinemaRepository(conn)
    cinemas = repo.list_all()
    if limit:
        cinemas = cinemas[:limit]

    console.print(f"[bold cyan]Synchronisation de {len(cinemas)} cinémas sur {days} jours (lot max: {batch_size or 'illimité'}, loop: {loop_batches})...[/bold cyan]")
    service = SyncService(conn)
    total_saved = 0
    errors = 0
    skipped_independent = 0
    synced_in_batch = 0
    total_synced_cinemas = 0
    rate_limited = False

    for i, c in enumerate(cinemas, start=1):
        if c.id.startswith("IND_"):
            skipped_independent += 1
            continue

        # Vérifier si au moins une date a besoin d'être synchronisée
        needs_sync = False
        for day_offset in range(days):
            target_date = date.today() + timedelta(days=day_offset)
            if force or not service.is_cinema_fresh(c.id, target_date):
                needs_sync = True
                break

        if not needs_sync:
            console.print(f"[{i}/{len(cinemas)}] [dim]✓ {c.name} : Déjà à jour en cache[/dim]")
            continue

        for attempt in range(2):
            try:
                saved = service.sync_cinema(c.id, days_count=days, force=force)
                total_saved += saved
                synced_in_batch += 1
                total_synced_cinemas += 1
                if saved > 0:
                    console.print(f"[{i}/{len(cinemas)}] [green]✓[/green] {c.name} : {saved} séances")
                else:
                    console.print(f"[{i}/{len(cinemas)}] [dim]–[/dim] {c.name} : 0 séance trouvée")

                # Délai aléatoire de politesse
                if delay is not None and delay >= 0:
                    sleep_time = delay
                else:
                    low = min(min_delay, max_delay)
                    high = max(min_delay, max_delay)
                    sleep_time = random.uniform(low, high) if high > 0 else 0

                if sleep_time > 0:
                    time.sleep(sleep_time)
                break

            except AllocineRateLimitError as e:
                if attempt == 0:
                    console.print(f"[{i}/{len(cinemas)}] [bold red]Rate limit Allociné détecté (HTTP 429) pour {c.name}. Pause de 30s puis nouvelle tentative...[/bold red]")
                    time.sleep(30)
                else:
                    errors += 1
                    console.print(f"[{i}/{len(cinemas)}] [bold red]Échec après tentative (HTTP 429) pour {c.name} : {e}[/bold red]")
                    console.print("[bold yellow]Arrêt gracieux du lot pour protéger le quota Allociné.[/bold yellow]")
                    rate_limited = True
                    break
            except Exception as e:
                errors += 1
                console.print(f"[{i}/{len(cinemas)}] [red]✗ Erreur pour {c.name} ({c.id}) : {e}[/red]")
                break

        if rate_limited:
            console.print("[yellow]Interruption gracieuse : les séances récupérées sont conservées.[/yellow]")
            break

        if batch_size and synced_in_batch >= batch_size:
            if loop_batches:
                console.print(f"[bold cyan]Lot de {synced_in_batch} cinémas terminé. Pause de sécurité de {batch_pause}s avant le lot suivant...[/bold cyan]")
                time.sleep(batch_pause)
                synced_in_batch = 0
            else:
                console.print(f"[bold cyan]Lot de {synced_in_batch} cinémas terminé. Fin du run actuel.[/bold cyan]")
                break

    msg = f"[bold green]Synchronisation terminée ![/bold green] {total_saved} séances enregistrées ({errors} erreurs, {total_synced_cinemas} synchronisés ce run)"
    if skipped_independent > 0:
        msg += f" [dim]({skipped_independent} cinémas indépendants sans code Allociné ignorés)[/dim]"
    console.print(msg)

if __name__ == "__main__":
    app()

