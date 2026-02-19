import argparse

from config import API_HOST, API_PORT, DEBUG


def run_api_server():
    from api import app

    app.run(debug=DEBUG, host=API_HOST, port=API_PORT, use_reloader=False)


def run_scraper_once():
    from core.controller import ExecutionController

    controller = ExecutionController()
    controller.run_single()


def main():
    parser = argparse.ArgumentParser(description="Hoax Monitoring backend launcher")
    parser.add_argument(
        "--mode",
        choices=["api", "scrape"],
        default="api",
        help="Run API server (default) or single scraper cycle",
    )
    args = parser.parse_args()

    if args.mode == "scrape":
        run_scraper_once()
        return

    run_api_server()


if __name__ == "__main__":
    main()
