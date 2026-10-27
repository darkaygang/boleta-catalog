"""Payment settings contract; no remote state or live exchange-rate requests."""
import copy
import unittest
from fastapi import HTTPException
from server.main import validate_settings
from server.settings import DEFAULT_SETTINGS
from server.state import StateStore


class PaymentSettingsTests(unittest.TestCase):
    def payload(self):
        value = copy.deepcopy(DEFAULT_SETTINGS)
        value["payment"].update(conversion_mode="usdt_to_bcv", bcv_rate=887.30, bcv_date="2026-10-26", usdt_rate=1005, usdt_date="2026-10-26", deposit_percent=50)
        return value

    def test_explicit_dual_rate_and_half_deposit_roundtrip(self):
        payload = self.payload()
        self.assertEqual(validate_settings(payload)["payment"], payload["payment"])

    def test_invalid_rates_dates_and_modes_are_rejected(self):
        for field, bad in (("bcv_rate", 0), ("usdt_rate", None), ("usdt_rate", True), ("usdt_rate", float("inf")), ("usdt_date", "2026-02-30"), ("bcv_date", "2026-1-01"), ("bcv_date", ""), ("conversion_mode", "invented"), ("conversion_mode", []), ("deposit_percent", 101)):
            with self.subTest(field=field, bad=bad):
                payload = self.payload()
                payload["payment"][field] = bad
                with self.assertRaises(HTTPException) as failure:
                    validate_settings(payload)
                self.assertEqual(failure.exception.status_code, 422)

    def test_legacy_mode_remains_valid_without_any_exchange_rate(self):
        payload = copy.deepcopy(DEFAULT_SETTINGS)
        self.assertEqual(validate_settings(payload)["payment"]["conversion_mode"], "bcv")

    def test_new_defaults_preserve_saved_rates_and_existing_commercial_terms(self):
        state = StateStore(allow_local=True).seed()
        state["settings"]["published"]["payment"] = {"bcv_rate": 887.3, "bcv_date": "2026-10-26", "deposit_percent": 50}
        completed = StateStore.complete(state)["settings"]["published"]["payment"]
        self.assertEqual(completed["bcv_rate"], 887.3)
        self.assertEqual(completed["deposit_percent"], 50)
        self.assertEqual(completed["conversion_mode"], "bcv")
        self.assertIsNone(completed["usdt_rate"])


if __name__ == "__main__":
    unittest.main()
