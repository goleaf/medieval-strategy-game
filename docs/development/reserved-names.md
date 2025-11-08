# Reserved Alliance Names

This registry prevents impersonation and enforces lore consistency. Live-ops owns the list and keeps it synchronized with production.

## File Locations
- `config/reserved-alliance-names.json` — canonical list loaded at runtime.
- `scripts/alliance-reserve-name.ts` — CLI helper to add/remove names with audit logging.

## Update Procedure
1. Pull latest `main` and ensure `config/reserved-alliance-names.json` is up to date.
2. Run `npx tsx scripts/alliance-reserve-name.ts add "Name" --reason "why"`.
3. Submit PR referencing ticket + attach approval from product or legal.
4. On merge, run `npm run prisma:seed` or world-specific deployment script so servers pick up the new list.

## Maintenance Notes
- Avoid generic words ("Alliance")—only specific lore-sensitive names or proven abuse vectors.
- Duplicates are case-insensitive; script rejects them automatically.
- Keep an audit trail in the PR description (who requested, link to abuse report).
