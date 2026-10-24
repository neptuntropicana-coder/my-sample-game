// Level layout for my-sample-game.
//
// One character per tile:
//   '.'  air                '#'  solid ground        '='  brick (solid)
//   'P'  pipe (solid)       'G'  goal (triggers a win)
//
// Rows are built from 16-character chunks so every row is exactly 96 tiles
// wide (1440x270 px at TILE = 15). Edit freely, but keep the chunk count
// identical on every row. game.js throws at load if a row length is wrong.

const AIR = "................";
const SOLID = "################";

const LEVEL = [
  // 0
  AIR + AIR + AIR + AIR + AIR + AIR,
  // 1
  AIR + AIR + AIR + AIR + AIR + AIR,
  // 2
  AIR + AIR + AIR + AIR + AIR + AIR,
  // 3
  AIR + AIR + AIR + AIR + AIR + AIR,
  // 4
  AIR + AIR + AIR + AIR + AIR + AIR,
  // 5
  AIR + AIR + AIR + AIR + AIR + AIR,
  // 6
  AIR + AIR + AIR + AIR + AIR + AIR,
  // 7  brick ledge
  AIR + AIR + AIR + "........========" + AIR + AIR,
  // 8
  AIR + AIR + AIR + AIR + AIR + AIR,
  // 9  brick ledge
  AIR + "........========" + AIR + AIR + AIR + AIR,
  // 10 brick ledge + goal
  AIR + AIR + AIR + AIR + "........========" + "............G...",
  // 11 goal pole
  AIR + AIR + AIR + AIR + AIR + "............G...",
  // 12 tall pipe + goal
  AIR + AIR + AIR + "..PP............" + AIR + "............G...",
  // 13 short pipe + tall pipe + goal
  AIR + "....PP.........." + AIR + "..PP............" + AIR + "............G...",
  // 14
  AIR + "....PP.........." + AIR + "..PP............" + AIR + "............G...",
  // 15 ground, with two pits
  SOLID + SOLID + "########.....###" + SOLID + "##....##########" + SOLID,
  // 16
  SOLID + SOLID + "########.....###" + SOLID + "##....##########" + SOLID,
  // 17
  SOLID + SOLID + "########.....###" + SOLID + "##....##########" + SOLID,
];
