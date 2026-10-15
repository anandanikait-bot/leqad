# Apache License 2.0 proposal

## Status

**Pending repository-owner approval.** This document prepares the decision; it is not an active license grant. The repository does not currently contain a root `LICENSE` file, and public source visibility alone does not grant open-source reuse rights.

## Proposed action

After explicit owner approval:

1. Add the unmodified Apache License 2.0 text as the root `LICENSE` file.
2. Add any desired copyright notice without inventing ownership.
3. Update the README and contribution process to state that contributions are licensed under Apache-2.0.
4. Review whether a contributor license agreement or developer certificate of origin is needed.

Official license text: <https://www.apache.org/licenses/LICENSE-2.0.txt>

## Practical implications

Apache-2.0 is a permissive open-source license. It generally allows use, modification, distribution, sublicensing, and commercial use while requiring preservation of the license and relevant notices. It includes an express patent license from contributors and a patent-termination provision. It does not require downstream proprietary products to publish their source code.

For a future commercial startup, this supports an open-core or services business and broad adoption while allowing proprietary offerings around hosted services, enterprise features, content, or integrations. It also means competitors may legally use and commercialize the licensed code if they follow the license. Trademarks, hosted data, credentials, lesson content ownership, third-party dependencies, and any future proprietary components need separate treatment.

This summary is operational guidance, not legal advice. The owner should confirm copyright ownership and obtain legal review appropriate to the planned company before approval.

## Apache-2.0 versus source-available for a startup

| Decision factor                  | Apache-2.0                                                                                                      | Source-available                                                                                          |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Commercial Leqad business        | Can sell the product, hosting, support, and proprietary additions.                                              | Can sell the product and licenses under the terms the owner selects.                                      |
| Competitor reuse                 | Competitors may fork, host, and sell the licensed code while meeting notice requirements.                       | May restrict competing hosting or other commercial reuse if the chosen license explicitly does so.        |
| Adoption and contributions       | Standard open-source terms support broad integration and contributor familiarity.                               | Visible code aids inspection, but restrictions can reduce adoption and exclude use by some companies.     |
| Patent rights                    | Express contributor patent grant with a termination provision.                                                  | Depends on the exact license; there is no single source-available patent policy.                          |
| Distribution and proprietary use | Does not require downstream proprietary code to be published.                                                   | Rights, restrictions, redistribution, and derivative-work terms depend on the selected text.              |
| Future licensing                 | Existing Apache grants cannot simply be revoked from recipients; owned future code can be licensed differently. | Changes and any conversion to open source depend on the license and ownership. Prior grants still matter. |

Choose Apache-2.0 if broad ecosystem adoption matters more than restricting competitors' use of this code. Choose a specific source-available license if commercial-use restrictions are part of the business model, then review its exact terms before granting rights. Source-available is not automatically open source, and it is not a license name.

Either choice requires clear ownership of code, lesson content, and contributor rights. A later dual-license strategy requires rights to relicense relevant contributions. Trademark/brand protection and proprietary hosted services are separate decisions. **Owner decision remains pending; no LICENSE is added by this proposal.**
