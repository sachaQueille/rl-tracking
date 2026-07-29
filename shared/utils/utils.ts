const rocketLeague2v2Ranks = [
  { rank: "Bronze I", minMMR: 0, maxMMR: 174, name: "bronze1" },
  { rank: "Bronze II", minMMR: 175, maxMMR: 234, name: "bronze2" },
  { rank: "Bronze III", minMMR: 235, maxMMR: 294, name: "bronze3" },

  { rank: "Silver I", minMMR: 295, maxMMR: 354, name: "silver1" },
  { rank: "Silver II", minMMR: 355, maxMMR: 414, name: "silver2" },
  { rank: "Silver III", minMMR: 415, maxMMR: 474, name: "silver3" },

  { rank: "Gold I", minMMR: 475, maxMMR: 534, name: "gold1" },
  { rank: "Gold II", minMMR: 535, maxMMR: 594, name: "gold2" },
  { rank: "Gold III", minMMR: 595, maxMMR: 654, name: "gold3" },

  { rank: "Platinum I", minMMR: 655, maxMMR: 714, name: "plat1" },
  { rank: "Platinum II", minMMR: 715, maxMMR: 774, name: "plat2" },
  { rank: "Platinum III", minMMR: 775, maxMMR: 834, name: "plat3" },

  { rank: "Diamond I", minMMR: 835, maxMMR: 914, name: "diamond1" },
  { rank: "Diamond II", minMMR: 915, maxMMR: 994, name: "diamond2" },
  { rank: "Diamond III", minMMR: 995, maxMMR: 1074, name: "diamond3" },

  { rank: "Champion I", minMMR: 1075, maxMMR: 1194, name: "champion1" },
  { rank: "Champion II", minMMR: 1195, maxMMR: 1314, name: "champion2" },
  { rank: "Champion III", minMMR: 1315, maxMMR: 1434, name: "champion3" },

  {
    rank: "Grand Champion I",
    minMMR: 1435,
    maxMMR: 1574,
    name: "grandchampion1",
  },
  {
    rank: "Grand Champion II",
    minMMR: 1575,
    maxMMR: 1705,
    name: "grandchampion2",
  },
  {
    rank: "Grand Champion III",
    minMMR: 1706,
    maxMMR: 1875,
    name: "grandchampion3",
  },

  {
    rank: "Supersonic Legend",
    minMMR: 1876,
    maxMMR: Infinity,
    name: "supersoniclegend",
  },
];

export const getRankFromMMR = (mmr: number) => {
  return rocketLeague2v2Ranks.find(
    ({ minMMR, maxMMR }) => mmr >= minMMR && mmr <= maxMMR,
  );
};
