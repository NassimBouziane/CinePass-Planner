import socket
import pytest

@pytest.fixture(autouse=True)
def block_external_network_calls(monkeypatch):
    """
    Guarantees that no unit test can make real outbound network calls to Allociné
    or any external service. All network operations must be mocked.
    """
    original_connect = socket.socket.connect

    def guarded_connect(self, address):
        host = address[0] if isinstance(address, tuple) and len(address) > 0 else str(address)
        if host in ("127.0.0.1", "localhost", "::1"):
            return original_connect(self, address)
        raise RuntimeError(
            f"Network call blocked in unit tests: attempted connection to {address}. "
            "All calls to Allociné API or external services must be strictly mocked."
        )

    monkeypatch.setattr(socket.socket, "connect", guarded_connect)
