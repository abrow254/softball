-- Convert player display names to "First L." initials format.
-- Keyed by id (not name) so there's no ambiguity. Run in the Supabase SQL editor.
-- Ambiguous / unknown players are intentionally left out — see chat.

update players set name = 'Aaron B.'   where id = 'd23c1ed6-b8aa-53e5-82e0-8e05aa383564'; -- Aaron Brown
update players set name = 'Al B.'      where id = '3addc184-3dc7-5a74-bcb3-2afc7a952670'; -- Al Brown
update players set name = 'Andrew M.'  where id = '92f0cdda-ab58-5790-9ba3-33c7cbe89959'; -- Andrew Maloney
update players set name = 'April M.'   where id = '9ab9da1e-73f8-51bc-a2f8-a337f2859cf8'; -- April Muir
update players set name = 'Becky B.'   where id = '983adab8-196e-5836-8538-f68c01abaf15'; -- Becky Breau
update players set name = 'Ben J.'     where id = 'e96cccbb-863e-5f41-97d5-3e0be6291167'; -- Ben James
update players set name = 'Brenden M.' where id = 'c1f3dc65-24a1-5ac3-8ebc-610de3c31187'; -- Brenden Muir
update players set name = 'Cole F.'    where id = '08f8c13e-89e2-5436-8e3f-4ead79bd455b'; -- Cole Friyia
update players set name = 'Dan T.'     where id = '87c68ce1-db44-56e0-b0e3-c1a8802fba8e'; -- Dan Try
update players set name = 'Emily Y.'   where id = 'b7dc06fc-b9f9-5b23-a21f-9522b635e863'; -- Emily Yanchus
update players set name = 'Erin R.'    where id = '4d52bf77-1859-5042-8712-333d04479a50'; -- Erin Rogers
update players set name = 'Geoff L.'   where id = '384c0395-56f1-5bf0-bff7-340cbebbc136'; -- Geoff Lowe
update players set name = 'Ivana K.'   where id = '661f3577-37a1-55df-8820-856c11544a1a'; -- Ivana Kovac
update players set name = 'Jackson Y.' where id = 'bb0029ca-a8d5-5cd7-ab3c-a30f17d3f75c'; -- Jackson Yanchus
update players set name = 'Josh T.'    where id = 'fb006976-a98b-57d5-95ce-ff89496df371'; -- Josh Try
update players set name = 'Kaitlyn S.' where id = '133447cc-6822-5a48-b5ad-5d902f1cc19f'; -- Kaitlyn Speedman
update players set name = 'Laena L.'   where id = '6f9b61f5-740e-5788-b615-1ef3b9db27df'; -- Laena Leandro
update players set name = 'Liam F.'    where id = '4e3540ec-8fc4-54a3-9ebb-639a9362eca0'; -- Liam Fitzpatrick
update players set name = 'Marko K.'   where id = 'c525281d-7b53-500b-a10c-e400cf404f1e'; -- Marko Kovac
update players set name = 'Meryl B.'   where id = '3575887b-27c5-56c7-9039-01aa86e8c9e5'; -- Meryl Brown
update players set name = 'Paige M.'   where id = '31dd7601-a61a-5ead-b5e8-7f7f124a6b5b'; -- Paige Maloney
update players set name = 'Rick S.'    where id = '5fad23d7-854b-5614-b5a5-67477dd8cc51'; -- Rick Starr
update players set name = 'Sam C.'     where id = '5ddd97f0-2550-51fd-8f27-30ab7c2af5df'; -- Samantha Cascanette
update players set name = 'Sarah D.'   where id = '1360fedd-fad6-5747-9b20-2c76a3a251a1'; -- Sarah D'Angelo
update players set name = 'Sarah J.'   where id = '5a2be9f4-832c-5619-b807-ae3223c1f63c'; -- Sarah James
update players set name = 'Mike C.'    where id = '46efce23-3681-5de1-a98d-8e6048383af3'; -- Mike Choja
update players set name = 'Mike S.'    where id = '3a8f394e-aff2-57d3-a882-5028254405e1'; -- Mike Starr ("Starr" row)

-- Left first-name-only (not on the current roster, no last name): Brian, Eddie, Jack, Laura.
