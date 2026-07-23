# Verification Contract

A release candidate is accepted only when all of the following pass:

1. JavaScript syntax validation for every source, test, and CLI module
2. Automated unit and integration tests
3. No em dash character in repository text
4. No raw credential fixture or runtime secret in the package
5. Package dry-run contains only intended source and documentation
6. CLI version, help, status, and doctor smoke tests
7. TUI layout tests at narrow, medium, and wide terminal sizes
8. Transcript and sidebar scroll tests
9. Loadout slot limit, external skill, and selective context tests
10. Provider catalog and custom model tests
11. Secret vault encryption and log redaction tests
12. Telegram and Discord authorization and pairing tests
13. GitHub Actions on Linux, Windows, and macOS

Live provider and gateway tests remain environment-dependent. They require valid credentials and external network access.
