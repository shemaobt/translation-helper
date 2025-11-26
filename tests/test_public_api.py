"""
Integration tests for public API endpoints (translation, transcription, TTS).
"""
import pytest
import requests


@pytest.mark.api
@pytest.mark.quick
def test_public_api_info(app_url, public_api_client):
    """Test GET /api/public/info endpoint returns API information."""
    response = public_api_client.get(f"{app_url}/api/public/info")
    
    assert response.status_code == 200
    data = response.json()
    assert "endpoints" in data
    assert "voices" in data
    assert "rateLimit" in data
    

@pytest.mark.api
@pytest.mark.integration
def test_public_translate(app_url, public_api_client):
    """Test POST /api/public/translate endpoint."""
    payload = {
        "text": "Hello world",
        "fromLanguage": "en-US",
        "toLanguage": "es-ES",
        "context": "Casual greeting"
    }
    
    response = public_api_client.post(
        f"{app_url}/api/public/translate",
        json=payload
    )
    
    assert response.status_code == 200
    data = response.json()
    
    assert "translatedText" in data
    assert "fromLanguage" in data
    assert "toLanguage" in data
    assert "originalText" in data
    assert data["originalText"] == "Hello world"
    assert data["fromLanguage"] == "en-US"
    assert data["toLanguage"] == "es-ES"
    assert isinstance(data["translatedText"], str)
    assert len(data["translatedText"]) > 0


@pytest.mark.api
@pytest.mark.quick
def test_public_translate_validation(app_url, public_api_client):
    """Test translation endpoint with invalid input."""
    # Missing text
    response = public_api_client.post(
        f"{app_url}/api/public/translate",
        json={"fromLanguage": "en-US", "toLanguage": "es-ES"}
    )
    assert response.status_code == 400
    
    # Text too long
    response = public_api_client.post(
        f"{app_url}/api/public/translate",
        json={"text": "a" * 3000, "fromLanguage": "en-US", "toLanguage": "es-ES"}
    )
    assert response.status_code == 400


@pytest.mark.api
@pytest.mark.quick
def test_public_translate_multilingual(app_url, public_api_client):
    """Test translation with different language pairs."""
    test_cases = [
        ("Hello", "en-US", "fr-FR"),
        ("Bonjour", "fr-FR", "en-US"),
        ("Hola", "es-ES", "en-US"),
        ("Olá", "pt-BR", "en-US"),
    ]
    
    for text, from_lang, to_lang in test_cases:
        payload = {
            "text": text,
            "fromLanguage": from_lang,
            "toLanguage": to_lang
        }
        
        response = public_api_client.post(
            f"{app_url}/api/public/translate",
            json=payload
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "translatedText" in data
        assert len(data["translatedText"]) > 0


@pytest.mark.api
@pytest.mark.slow
def test_public_translate_with_context(app_url, public_api_client):
    """Test translation with context information."""
    payload = {
        "text": "Bank",
        "fromLanguage": "en-US",
        "toLanguage": "es-ES",
        "context": "Financial institution"
    }
    
    response = public_api_client.post(
        f"{app_url}/api/public/translate",
        json=payload
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "translatedText" in data
    # With context "Financial institution", should translate to "Banco" not "Orilla"
    assert len(data["translatedText"]) > 0

