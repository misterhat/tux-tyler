#!/usr/bin/env node

const fs = require('fs');
const process = require('process');

const LEVEL_TPL = `
(supertux-level
  (version 3)
  (name (_ "$name"))
  (author "$author")
  (license "$license")
  (target-time 30)
  (sector
    (name "main")
    (ambient-light
      (color 1 1 1)
    )
    (background
      (alignment "bottom")
      (speed 0.35)
      (image-top "images/background/arctis2.png")
      (image "images/background/arctis2.png")
      (image-bottom "images/background/arctis2.png")
    )
    (camera
      (name "Camera")
      (mode "normal")
    )
    (music
      (file "music/antarctic/chipdisko.ogg")
    )
    $entities$tilemaps
  )
)`;

const TILEMAP_TPL = `
    (tilemap
      (solid #$solid)
      (z-pos $zPos)
      (width $width)
      (height $height)
      (tiles $tiles
      )
    )`;

const jsonMap = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));

// tile IDs for -100 z-pos non-solid tilemap
const backgroundMap = [];

// tile IDs for 0 z-pos solid tilemap
const obstacleMap = [];

// [ { name, x, y } ]
const entities = [];

// TODO move to file
const obstacleConversions = [
    {
        find: [
            [0, 13],
            [0, 0]
        ],
        replace: [12, 0]
    },
    {
        find: [
            [0, 0],
            [0, 13]
        ],
        replace: [0, 10]
    },
    { find: [[0, 13]], replace: [11] },

    /*{
        find: [
            [0, 0],
            [7, 2]
        ],
        replace: [85, 86]
    },

    { find: [[0, 0]], replace: [0] }*/
];

const foregroundConversions = [];

function formatEntities(entities) {
    return entities
        .map((entity) => {
            const name = entity.entityName;

            delete entity.entityName;

            let formatted = `(${name}\n`;

            formatted += Object.entries(entity)
                .map(([key, value]) => {
                    value = typeof value === 'string' ? `"${value}"` : value;
                    return `      (${key} ${value})`;
                })
                .join('\n');

            formatted += '\n    )';

            return formatted;
        })
        .join('\n');
}

// convert tyler maps into supertux tile IDs
function convertTiles(tiles, conversions) {
    // clone
    tiles = JSON.parse(JSON.stringify(tiles));

    const width = tiles[0].length;
    const height = tiles.length;

    for (let y = 0; y < height; y += 1) {
        for (let i = 0; i < conversions.length; i += 1) {
            const find = conversions[i].find.map((tile) => tile.join(','));
            const { replace } = conversions[i];

            for (let x = 0; x < width; x += 1) {
                let found = 0;

                for (let i = 0; i < find.length; i += 1) {
                    if (
                        !Array.isArray(tiles[y][x + i]) ||
                        x + i >= width ||
                        find[i] !== tiles[y][x + i].join(',')
                    ) {
                        continue;
                    }

                    found += 1;

                    if (found === find.length) {
                        for (let i = 0; i < find.length; i += 1) {
                            tiles[y][x + i] = replace[i];
                        }
                    }
                }
            }
        }
    }

    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            if (Array.isArray(tiles[y][x])) {
                tiles[y][x] = 0;
            }
        }
    }

    return tiles;
}

// turn the 2D array into a scheme-formatted array
function formatTiles(tiles) {
    const width = tiles[0].length;
    const height = tiles.length;
    let formatted = '\n';

    for (let y = 0; y < height; y += 1) {
        formatted += '      ';

        for (let x = 0; x < width; x += 1) {
            formatted += `${tiles[y][x]} `;
        }

        formatted += '\n';
    }

    return formatted;
}

function formatTilemap({ solid, zPos, tiles }) {
    const width = tiles[0].length;
    const height = tiles.length;

    let formatted = TILEMAP_TPL.replace('$solid', solid ? 't' : 'f')
        .replace('$zPos', zPos)
        .replace('$width', width)
        .replace('$height', height)
        .replace('$tiles', formatTiles(tiles));

    return formatted;
}

function formatLevel({ name, author, entities, tilemaps }) {
    let formatted = LEVEL_TPL.replace('$name', name)
        .replace('$author', author)
        .replace('$entities', formatEntities(entities))
        .replace('$tilemaps', tilemaps.map(formatTilemap).join('\n'))
        .trim();

    return formatted;
}

entities.push({
    entityName: 'spawnpoint',
    name: 'main',
    x: 16,
    y: 50
});

const obstacleTilemap = {
    solid: true,
    zPos: 0,
    tiles: convertTiles(jsonMap, obstacleConversions)
};

console.log(
    formatLevel({
        name: 'test',
        author: 'Zorian Medwid',
        entities,
        tilemaps: [obstacleTilemap]
    })
);

//console.log(JSON.stringify(convertTiles(jsonMap)));
