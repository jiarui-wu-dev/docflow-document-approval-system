import unittest
import argparse
import io
import json
from collections import Counter
from datetime import datetime, timedelta
from unittest.mock import patch
from demo_data import MARKER, TARGET, generate, literal, sql_for, target, main


class DemoDataTests(unittest.TestCase):
    def setUp(self):
        self.now = datetime(2026, 10, 17, 18, 0)
        self.records = generate(self.now)

    def test_exact_distribution_and_stable_identity(self):
        self.assertEqual(len(self.records), 150)
        self.assertEqual(Counter(d['status'] for d in self.records), TARGET)
        self.assertEqual(len({d['title'] for d in self.records}), 150)
        later = generate(self.now + timedelta(days=10))
        self.assertEqual([d['prefix'] for d in self.records], [d['prefix'] for d in later])
        self.assertEqual([d['marker'] for d in self.records], [d['marker'] for d in later])

    def test_valid_workflow_and_chronology(self):
        transitions = {('DRAFT', 'SUBMITTED'), ('SUBMITTED', 'IN_REVIEW'), ('IN_REVIEW', 'APPROVED'), ('IN_REVIEW', 'REJECTED')}
        self.assertEqual(sum(len(d['history']) for d in self.records), 310)
        self.assertEqual(sum(len(d['comments']) for d in self.records), 175)
        for doc in self.records:
            old, time = 'DRAFT', datetime.fromisoformat(doc['created'])
            self.assertGreaterEqual(time, self.now - timedelta(days=90))
            self.assertLessEqual(time, datetime.fromisoformat(doc['updated']))
            for event in doc['history']:
                self.assertEqual(event['old'], old)
                self.assertIn((old, event['new']), transitions)
                self.assertGreaterEqual(datetime.fromisoformat(event['at']), time)
                old, time = event['new'], datetime.fromisoformat(event['at'])
                self.assertEqual(event['actor'], 'submitter' if old == 'SUBMITTED' else 'reviewer')
            self.assertEqual(old, doc['status'])
            self.assertLessEqual(time, datetime.fromisoformat(doc['updated']))
            self.assertLessEqual(datetime.fromisoformat(doc['updated']), self.now)
            for comment in doc['comments']:
                self.assertGreaterEqual(datetime.fromisoformat(comment['at']), datetime.fromisoformat(doc['history'][1]['at']))
                self.assertLessEqual(datetime.fromisoformat(comment['at']), datetime.fromisoformat(doc['updated']))

    def test_schema_limits_and_existing_user_roles(self):
        for doc in self.records:
            self.assertTrue(doc['description'].startswith(MARKER + doc['key'] + '\n'))
            self.assertLessEqual(len(doc['title']), 200)
            self.assertLessEqual(len(doc['description']), 2000)
            self.assertIn(doc['submitter'], ('alice', 'admin'))
            self.assertIn(doc['reviewer'], ('bob', 'admin'))
            self.assertNotEqual(doc['submitter'], doc['reviewer'])
            for event in doc['history']:
                self.assertLessEqual(len(event['remark']), 1000)
            for comment in doc['comments']:
                self.assertLessEqual(len(comment['content']), 2000)

    def test_seed_never_updates_or_deletes_existing_records(self):
        sql = sql_for('seed', self.records)
        self.assertNotIn('DELETE FROM', sql)
        self.assertNotIn('UPDATE documents', sql)
        self.assertNotIn('INSERT INTO users', sql)
        self.assertIn('WHERE NOT EXISTS', sql)
        self.assertIn('pg_advisory_xact_lock', sql)

    def test_cleanup_is_preview_unless_explicit_and_double_scoped(self):
        self.assertNotIn('DELETE FROM', sql_for('cleanup', self.records))
        cleanup = sql_for('cleanup', self.records, True)
        self.assertIn('DELETE FROM documents', cleanup)
        self.assertIn('starts_with(d.title,e.prefix) AND starts_with(d.description,e.marker)', cleanup)
        self.assertNotIn('DELETE FROM users', cleanup)

    def test_sql_literal_escapes_quotes(self):
        self.assertEqual(literal("owner's request"), "'owner''s request'")

    def test_remote_docker_endpoint_is_refused(self):
        args = argparse.Namespace(container='docflow-postgres', project='document-approval-system')
        with patch.dict('os.environ', {'DOCKER_HOST': 'ssh://remote.example.invalid'}, clear=True):
            with self.assertRaisesRegex(RuntimeError, 'non-local'):
                target(args)

    def test_context_override_cannot_bypass_local_endpoint_guard(self):
        args = argparse.Namespace(container='docflow-postgres', project='document-approval-system')
        with patch.dict('os.environ', {'DOCKER_HOST': 'unix:///var/run/docker.sock', 'DOCKER_CONTEXT': 'remote'}, clear=True):
            with patch('demo_data.docker', return_value=json.dumps([{'Endpoints': {'docker': {'Host': 'ssh://remote.example.invalid'}}}])):
                with self.assertRaisesRegex(RuntimeError, 'non-local'):
                    target(args)

    def test_wrong_compose_project_is_refused(self):
        args = argparse.Namespace(container='docflow-postgres', project='document-approval-system')
        info = {'State': {'Running': True}, 'Config': {'Labels': {'com.docker.compose.service': 'postgres', 'com.docker.compose.project': 'unrelated'}}}
        with patch.dict('os.environ', {'DOCKER_HOST': 'unix:///var/run/docker.sock'}, clear=True):
            with patch('demo_data.docker', return_value=json.dumps([info])):
                with self.assertRaisesRegex(RuntimeError, 'explicitly selected'):
                    target(args)

    def test_writes_require_opt_in_and_cleanup_confirmation(self):
        for argv in (['demo_data.py', 'seed'], ['demo_data.py', 'cleanup', '--execute', '--allow-local-demo-write']):
            with self.subTest(argv=argv), patch('sys.argv', argv), patch('sys.stderr', new_callable=io.StringIO):
                with patch('demo_data.target') as inspected:
                    with self.assertRaises(SystemExit) as error:
                        main()
                    self.assertEqual(error.exception.code, 2)
                    inspected.assert_not_called()


if __name__ == '__main__':
    unittest.main()
