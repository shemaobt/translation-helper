"""
Pytest configuration and fixtures for Translation Helper tests.
"""
import os
import pytest
import requests
from typing import Generator

# Test configuration
TEST_API_URL = os.getenv("TEST_API_URL", "http://localhost:5000")
TEST_DB_URL = os.getenv("TEST_DB_URL", "")


@pytest.fixture(scope="session")
def app_url() -> str:
    """Returns the base URL for the application API."""
    return TEST_API_URL


@pytest.fixture(scope="session")
def db_url() -> str:
    """Returns the database connection string for testing."""
    return TEST_DB_URL


@pytest.fixture(scope="session")
def client(app_url: str) -> Generator[requests.Session, None, None]:
    """
    Provides an HTTP client (requests.Session) for making API calls.
    The session automatically includes cookies for auth persistence.
    """
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    yield session
    session.close()


@pytest.fixture
def public_api_client(app_url: str) -> Generator[requests.Session, None, None]:
    """
    Provides a client for public API endpoints (no auth required).
    """
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    yield session
    session.close()

