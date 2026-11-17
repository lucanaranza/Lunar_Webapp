# L.A.N.D. – Lunar Area Navigation and Determination
Webapp for the NASA Space Apps hackathon. One page with both editions:

Educational -> tool to learn about Moon history + Games + Landing area choice
Professional -> analysis tool compiled with real NASA LOLA and JPL Horizon data

COMANDO
Get-ChildItem C:\Users\lucan\Desktop\Hackaton_Ephemerids\out_v2 -Recurse -Include mappa_*.json,evoluzione_*.json | Copy-Item -Destination C:\Users\lucan\Desktop\Lunar_Webapp\data\sites -Force 