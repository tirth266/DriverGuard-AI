"""
The app refuses to start on a missing or placeholder signing secret.

Two secrets gate the whole application and neither may have a fallback:
`SECRET_KEY` signs the OAuth `state` cookie, `JWT_SECRET` signs access tokens.
A default that ships in the source tree is a public key, so a deployment that
forgets to set one must fail loudly rather than silently signing with it.

`require_secret` is exercised directly, because it is a pure function of the
environment. The wiring is then checked in a subprocess, since the guard fires
once at import and the test process has already imported those modules. The
"absent" wiring is checked against a copy of the real config module placed
outside backend/, because the real one always finds backend/.env and would
happily supply the very variable the test is trying to withhold.

Run from the `backend` directory:  python -m pytest tests/test_secret_guards.py -v
"""
import importlib.util
import os
import shutil
import subprocess
import sys
import tempfile

import pytest

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG_PY = os.path.join(BACKEND_DIR, 'app', 'config.py')

# The historical placeholders. Each one shipped in source, so each one must be
# refused by name and not merely documented.
PLACEHOLDERS = [
    'dev-secret-key-change-in-prod',
    'your_flask_secret_key_change_in_production',
    'jwt-secret-change-in-prod',
]


@pytest.fixture(scope='module')
def config_src():
    """
    app.config loaded straight from its file.

    Loaded this way rather than with `import app.config`, because importing the
    package runs app/__init__.py, which pulls in torch and every router. The
    guard under test is the same code either way.
    """
    spec = importlib.util.spec_from_file_location('dg_config_under_test', CONFIG_PY)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


# ── require_secret itself ─────────────────────────────────────────────────────

@pytest.mark.parametrize('placeholder', PLACEHOLDERS)
def test_a_placeholder_is_refused_by_name(config_src, monkeypatch, placeholder):
    monkeypatch.setenv('JWT_SECRET', placeholder)

    with pytest.raises(RuntimeError) as raised:
        config_src.require_secret('JWT_SECRET', 'sign and verify access tokens')

    assert 'placeholder value that ships in the source tree' in str(raised.value)


def test_a_missing_secret_is_refused(config_src, monkeypatch):
    monkeypatch.delenv('JWT_SECRET', raising=False)

    with pytest.raises(RuntimeError) as raised:
        config_src.require_secret('JWT_SECRET', 'sign and verify access tokens')

    assert 'JWT_SECRET is not set' in str(raised.value)


def test_a_blank_secret_is_treated_as_missing(config_src, monkeypatch):
    monkeypatch.setenv('SECRET_KEY', '   ')

    with pytest.raises(RuntimeError) as raised:
        config_src.require_secret('SECRET_KEY', 'sign the OAuth state cookie')

    assert 'SECRET_KEY is not set' in str(raised.value)


def test_a_real_secret_is_returned_unchanged(config_src, monkeypatch):
    value = 'a-sufficiently-random-looking-value'
    monkeypatch.setenv('SECRET_KEY', value)

    assert config_src.require_secret('SECRET_KEY', 'sign the OAuth state cookie') == value


def test_the_refusal_names_the_remedy_and_echoes_no_value(config_src, monkeypatch):
    """A guard that prints the secret it is complaining about has leaked it."""
    monkeypatch.setenv('JWT_SECRET', 'jwt-secret-change-in-prod')

    with pytest.raises(RuntimeError) as raised:
        config_src.require_secret('JWT_SECRET', 'sign and verify access tokens')

    message = str(raised.value)
    assert 'JWT_SECRET' in message          # names the variable
    assert 'token_urlsafe' in message       # says how to fix it
    assert 'change-in-prod' not in message  # echoes no value of any kind


# ── The module-level wiring ───────────────────────────────────────────────────

def _import_in_subprocess(extra_env):
    env = dict(os.environ)
    env['DATABASE_URL'] = 'sqlite://'
    env['SECRET_KEY'] = 'a-real-random-test-value-for-this-guard-case'
    env['JWT_SECRET'] = 'another-real-random-test-value-for-this-guard'
    env.update(extra_env)
    return subprocess.run(
        [sys.executable, '-c', "import app.extensions, app.config; print('IMPORTED')"],
        cwd=BACKEND_DIR, env=env, capture_output=True, text=True,
    )


def test_the_session_cookie_key_is_wired_through_the_guard():
    result = _import_in_subprocess({'SECRET_KEY': 'dev-secret-key-change-in-prod'})

    assert 'IMPORTED' not in result.stdout
    assert 'placeholder value that ships in the source tree' in result.stderr


def test_the_jwt_signing_key_is_wired_through_the_guard():
    result = _import_in_subprocess({'JWT_SECRET': 'jwt-secret-change-in-prod'})

    assert 'IMPORTED' not in result.stdout
    assert 'placeholder value that ships in the source tree' in result.stderr


def test_both_secrets_are_read_from_independent_variables():
    """One leaked key must not compromise both the cookie and every token."""
    result = _import_in_subprocess({
        'SECRET_KEY': 'cookie-secret-only-value-here',
        'JWT_SECRET': 'jwt-signing-secret-only-value',
    })

    assert 'IMPORTED' in result.stdout, result.stdout + result.stderr


def test_a_deployment_without_a_dotenv_still_refuses_to_start():
    """
    The realistic first-run failure: a fresh clone with no backend/.env.

    Checked against a copy of the real config module placed in a directory with
    no .env, because the real one resolves its .env next to its own source file
    and would supply the very variable this test withholds.
    """
    with tempfile.TemporaryDirectory() as sandbox:
        copy = os.path.join(sandbox, 'config_copy.py')
        shutil.copyfile(CONFIG_PY, copy)
        assert not os.path.exists(os.path.join(sandbox, '.env'))

        env = dict(os.environ)
        env.pop('SECRET_KEY', None)
        env.pop('JWT_SECRET', None)
        result = subprocess.run(
            [
                sys.executable, '-c',
                "import importlib.util,sys;"
                "spec=importlib.util.spec_from_file_location('cfg',sys.argv[1]);"
                "m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)",
                copy,
            ],
            # cwd matters: config.py also calls a bare load_dotenv(), which walks
            # up from the working directory and would otherwise find backend/.env
            # and supply the very variable this test withholds.
            cwd=sandbox,
            env=env, capture_output=True, text=True,
        )

    assert 'SECRET_KEY is not set' in result.stderr, result.stdout + result.stderr
    assert 'JWT_SECRET is not set' not in result.stderr