// samples.mjs — twelve example cards, across every dataset and rarity, shared by the gallery page, the gallery tool and the
// tests. They are plain facts in the shape the DIGI card defines; nothing here is real customer data.
export const SAMPLES = [
  { id: '3f9a1c7e5b208d46', title: 'Churn Hunter', dataset: 'telco', department: 'retention', stage: 34, rarity: 'rare', generation: 2, parents: ['a41c0e93d7b25f68', '7be2d9c14a05831f'] },
  { id: 'b27d0e4a91c6f358', title: 'Basket Whisperer', dataset: 'shop', department: 'merchandising', stage: 12, rarity: 'uncommon', generation: 1, parents: ['3f9a1c7e5b208d46'] },
  { id: '0c58e1d3a79f4b62', title: 'Ledger Guardian', dataset: 'bank', department: 'risk', stage: 71, rarity: 'epic', generation: 4, parents: ['e913b6f0482ca7d5', 'd4e8120fa36b9c75'] },
  { id: 'e913b6f0482ca7d5', title: 'Census Scout', dataset: 'adult', department: 'research', stage: 5, rarity: 'common', generation: 0, parents: [] },
  { id: '5a07c9e2d1f84b36', title: 'Triage Sentinel', dataset: 'hospital', department: 'cardiology', stage: 99, rarity: 'legendary', generation: 9, parents: ['0c58e1d3a79f4b62', '81b3f5a7c0e9246d'] },
  { id: 'd4e8120fa36b9c75', title: 'Credit Oracle', dataset: 'credit', department: 'underwriting', stage: 47, rarity: 'epic', generation: 3, parents: ['b27d0e4a91c6f358'] },
  { id: '81b3f5a7c0e9246d', title: 'Plan Whisperer', dataset: 'custom', department: 'ops', stage: 0, rarity: 'common', generation: 0, parents: [] },
  { id: 'f60a2d8b4c179e53', title: "O'Hara & Sons Retail", dataset: 'shop', department: 'tills-north', stage: 63, rarity: 'rare', generation: 5, parents: ['b27d0e4a91c6f358', '5a07c9e2d1f84b36'] },
  { id: '29c7e4b0d8f1a356', title: 'Roaming Prophet', dataset: 'telco', department: 'roaming', stage: 88, rarity: 'legendary', generation: 12, parents: ['3f9a1c7e5b208d46', 'f60a2d8b4c179e53'] },
  { id: '7d3e9a1b6c04f258', title: 'Vault Keeper', dataset: 'bank', department: 'treasury', stage: 21, rarity: 'uncommon', generation: 1, parents: ['0c58e1d3a79f4b62'] },
  { id: 'c18f6d02e5a7b934', title: 'Ward Whisperer', dataset: 'hospital', department: 'a-and-e', stage: 56, rarity: 'rare', generation: 2, parents: [] },
  { id: '46b0e7c3a98d1f25', title: 'Late Payer Radar', dataset: 'credit', department: 'collections', stage: 9, rarity: 'common', generation: 7, parents: ['d4e8120fa36b9c75', '29c7e4b0d8f1a356'] },
];
