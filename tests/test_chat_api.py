"""
Integration tests for chat API endpoints.
"""
import pytest
import requests


@pytest.mark.api
@pytest.mark.auth
def test_chat_requires_authentication(app_url, client):
    """Test that chat endpoints require authentication."""
    # Attempt to create chat without authentication
    response = client.post(
        f"{app_url}/api/chats",
        json={"title": "Test Chat"}
    )
    # Should redirect to login or return 401
    assert response.status_code in [302, 401]


@pytest.mark.api
@pytest.mark.auth
def test_get_chats_requires_auth(app_url, client):
    """Test that getting chats requires authentication."""
    response = client.get(f"{app_url}/api/chats")
    # Should redirect to login or return 401
    assert response.status_code in [302, 401]


@pytest.mark.api
@pytest.mark.quick
def test_health_endpoint(app_url, client):
    """Test health check endpoint if it exists."""
    response = client.get(f"{app_url}/api/public/info")
    assert response.status_code == 200

