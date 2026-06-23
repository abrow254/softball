#!/usr/bin/env python3
"""Turn the parsed history JSON into an idempotent import SQL file.

Reads /tmp/history.json (from parse_history.py) and writes
supabase/import_history.sql: wipes prior data (NOT auth profiles), then inserts
players, seasons, one synthetic "season totals" game per season, and the
per-player season-total stat rows.
"""
import json
import sys


def q(s):
    return "'" + str(s).replace("'", "''") + "'"


def game_date(year, term):
    return f'{year}-07-01' if term == 'Summer' else f'{year}-10-01'


def main():
    data = json.load(open('/tmp/history.json'))
    players = data['players']
    seasons = data['seasons']
    out = []

    out.append('-- ============================================================')
    out.append('-- import_history.sql — GENERATED from the team Excel workbook')
    out.append('-- Season-aggregate history. Re-runnable: wipes prior rows first.')
    out.append('-- Does NOT touch profiles / auth.users.')
    out.append('-- ============================================================')
    out.append('')
    out.append('truncate at_bats, game_player_stats, lineups, games, seasons, players cascade;')
    out.append('')

    out.append('-- players (deduped across seasons; is_regular = latest-season status)')
    out.append('insert into players (id, name, is_regular, active) values')
    rows = [f"  ({q(p['player_id'])}, {q(p['name'])}, {str(p['is_regular']).lower()}, true)"
            for p in players]
    out.append(',\n'.join(rows) + ';')
    out.append('')

    out.append('-- seasons')
    out.append('insert into seasons (id, year, term, label, is_current) values')
    rows = [f"  ({q(s['season_id'])}, {s['year']}, {q(s['term'])}, {q(s['label'])}, {str(s['is_current']).lower()})"
            for s in seasons]
    out.append(',\n'.join(rows) + ';')
    out.append('')

    out.append('-- one synthetic "season totals" game per season (admin-only surface)')
    out.append('insert into games (id, season_id, game_date, opponent, our_runs, opp_runs) values')
    rows = [f"  ({q(s['game_id'])}, {q(s['season_id'])}, {q(game_date(s['year'], s['term']))}, "
            f"{q('Imported season totals')}, null, null)"
            for s in seasons]
    out.append(',\n'.join(rows) + ';')
    out.append('')

    out.append('-- per-player season totals (gp + per-season is_regular carried on the row)')
    out.append('insert into game_player_stats')
    out.append('  (game_id, player_id, singles, doubles, triples, hr, ab, fc, bb, hbp, roe, rbi, runs, k, gp, is_regular) values')
    stat_rows = []
    pid = {p['name']: p['player_id'] for p in players}
    for s in seasons:
        for r in s['players']:
            stat_rows.append(
                f"  ({q(s['game_id'])}, {q(pid[r['name']])}, "
                f"{r['singles']}, {r['doubles']}, {r['triples']}, {r['hr']}, "
                f"{r['ab']}, {r['fc']}, {r['bb']}, {r['hbp']}, {r['roe']}, "
                f"{r['rbi']}, {r['runs']}, {r['k']}, {r['gp']}, {str(r['is_regular']).lower()})"
            )
    out.append(',\n'.join(stat_rows) + ';')
    out.append('')

    print('\n'.join(out))
    print(f'-- {len(players)} players, {len(seasons)} seasons, {len(stat_rows)} stat rows',
          file=sys.stderr)


if __name__ == '__main__':
    main()
