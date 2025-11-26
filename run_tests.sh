#!/bin/bash
# Test runner script for Translation Helper integration tests

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Default values
TEST_API_URL="${TEST_API_URL:-http://localhost:5000}"
RUN_MODE="${1:-all}"

echo -e "${BLUE}Translation Helper - Integration Test Runner${NC}"
echo "=============================================="
echo ""
echo -e "API URL: ${YELLOW}${TEST_API_URL}${NC}"
echo ""

# Check if pytest is installed
if ! command -v pytest &> /dev/null; then
    echo -e "${RED}Error: pytest is not installed${NC}"
    echo "Install test dependencies:"
    echo "  pip install -r requirements-test.txt"
    exit 1
fi

# Export TEST_API_URL for pytest
export TEST_API_URL

case "$RUN_MODE" in
    all)
        echo -e "${GREEN}Running all integration tests...${NC}"
        pytest tests/ -v
        ;;
    
    quick)
        echo -e "${GREEN}Running quick tests only...${NC}"
        pytest tests/ -v -m quick
        ;;
    
    coverage)
        echo -e "${GREEN}Running tests with coverage...${NC}"
        pytest tests/ -v --cov=server --cov-report=html --cov-report=term
        echo ""
        echo -e "${GREEN}Coverage report generated in htmlcov/index.html${NC}"
        ;;
    
    parallel)
        echo -e "${GREEN}Running tests in parallel...${NC}"
        pytest tests/ -v -n auto
        ;;
    
    api)
        echo -e "${GREEN}Running API tests only...${NC}"
        pytest tests/ -v -m api
        ;;
    
    auth)
        echo -e "${GREEN}Running authentication tests only...${NC}"
        pytest tests/ -v -m auth
        ;;
    
    *)
        echo -e "${RED}Unknown test mode: $RUN_MODE${NC}"
        echo ""
        echo "Usage: ./run_tests.sh [mode]"
        echo ""
        echo "Available modes:"
        echo "  all        - Run all tests (default)"
        echo "  quick      - Run quick tests only"
        echo "  coverage   - Run tests with coverage report"
        echo "  parallel   - Run tests in parallel"
        echo "  api        - Run API tests only"
        echo "  auth       - Run authentication tests only"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}✓ Tests completed${NC}"

