import sys
import unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import ai_service as api

class ServiceTests(unittest.TestCase):
    def test_dispose_preserves_ids_and_requests_selected_language(self):
        with patch.object(api, 'parsed_completion', return_value={'items':[{'id':'a','handle':'donate','reason':'Check condition first.'}]}) as model:
            result=api.handle_api('/api/dispose',{'language':'en','items':[{'id':'a','name':'Desk'}]})
            self.assertEqual(result['language'],'en')
            self.assertEqual(result['items'][0]['handle'],'donate')
            self.assertIn('English',model.call_args.args[0])
    def test_invalid_disposal_model_mapping_rejected(self):
        for rows in [[],[{'id':'wrong','handle':'sell','reason':'Useful'}],[{'id':'a','handle':'dump','reason':'Unknown'}]]:
            with patch.object(api,'parsed_completion',return_value={'items':rows}):
                with self.assertRaises(api.APIError):
                    api.handle_api('/api/dispose',{'items':[{'id':'a','name':'Desk'}]})
    def test_plan_prompt_preserves_scheduled_decisions(self):
        with patch.object(api,'completion',return_value='Move the desk on Monday.') as model:
            result=api.handle_api('/api/plan',{'language':'en','items':[{'id':'a','name':'Desk','bucket':'day1'}],'dates':['2026-10-19']})
            self.assertEqual(result['language'],'en')
            self.assertIn('Never suggest donating',model.call_args.args[0])
    def test_invalid_language_never_calls_model(self):
        with patch.object(api,'completion') as model:
            with self.assertRaises(api.APIError):api.handle_api('/api/plan',{'language':'invalid','items':[]})
            model.assert_not_called()
    def test_invalid_day_and_duplicates_rejected(self):
        for rows in [[{'id':'a','day':True}],[{'id':'a','day':2}]]:
            with patch.object(api,'parsed_completion',return_value={'items':rows}):
                with self.assertRaises(api.APIError):api.handle_api('/api/arrange',{'items':[{'id':'a','name':'Desk'}],'dates':['2026-10-19']})
    def test_service_missing_key_is_explicit_failure(self):
        with patch.dict(api.os.environ,{'ARK_API_KEY':''}):
            with self.assertRaises(api.APIError) as error:api.completion('test')
            self.assertEqual(error.exception.status,503)
if __name__ == '__main__':unittest.main()
