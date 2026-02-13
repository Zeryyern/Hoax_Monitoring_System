import time
import threading
from datetime import datetime, timedelta
from logger import logger
from core.runner import run_once


class ExecutionController:
    def __init__(self):
        self.is_running = False
        self.thread = None

    def run_single(self):
        logger.info("Controller: Running single execution")
        run_once()

    def start_continuous(self, interval_seconds: int = 300, max_runtime_seconds: int = None):
        """
        Start continuous execution.

        interval_seconds: delay between runs
        max_runtime_seconds: auto-stop after this duration (optional)
        """
        if self.is_running:
            logger.warning("Controller already running")
            return

        logger.info("Controller: Starting continuous mode")
        self.is_running = True

        def _run_loop():
            start_time = datetime.now()

            while self.is_running:
                run_once()

                # Check max runtime
                if max_runtime_seconds:
                    elapsed = datetime.now() - start_time
                    if elapsed >= timedelta(seconds=max_runtime_seconds):
                        logger.info("Controller: Max runtime reached. Stopping.")
                        self.is_running = False
                        break

                logger.info(f"Controller: Sleeping for {interval_seconds} seconds")
                time.sleep(interval_seconds)

            logger.info("Controller: Continuous mode stopped")

        self.thread = threading.Thread(target=_run_loop, daemon=True)
        self.thread.start()

    def stop(self):
        if not self.is_running:
            logger.warning("Controller is not running")
            return

        logger.info("Controller: Stop signal received")
        self.is_running = False
