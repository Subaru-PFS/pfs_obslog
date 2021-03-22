import argparse
import json
import subprocess
import logging
from pathlib import Path

logger = logging.getLogger(__name__)
HERE = Path(__file__).parent


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--slack', '-x', action='store_true')
    args = parser.parse_args()

    slack_url = (HERE / 'secrets' / 'slack_url').read_text().strip()

    try:
        subprocess.check_output(['curl', '--fail', 'http://133.40.164.16/obslog/api/healthz'], stderr=subprocess.STDOUT)
    except subprocess.CalledProcessError as e:
        output = e.output
        stderr = output.decode(errors='ignore')
        text = 'pfs-obslog: ' + str(e)
        logger.warning(text)
        if args.slack:
            subprocess.check_call([
                'curl', '-X', 'POST', '-H', 'Content-type: application/json',
                '--data', json.dumps({'text': text}), slack_url
            ])


if __name__ == '__main__':
    main()
