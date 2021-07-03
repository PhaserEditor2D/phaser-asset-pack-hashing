# Phaser Asset Pack Hashing

A script for hashing the Phaser Asset Pack files, making them ready for production.

The Asset Pack Files are a key part of [Phaser Editor 2D](https://phasereditor2d.com).

## Motivation

It is common that build tools like Webpack generate production files that include the content hash in the file name.
The `phaser-asset-pack-hashing` script allows changing the Phaser Asset Pack files internal URLs for including the file hash.

For example, if yo have an Asset Pack File like this:

```json
{
    "section1": {
        "files":[
            {
                "type": "image",
                "key": "background",
                "url": "assets/background.png"
            }
        ]
    }
}
```

The script modifies it changing the URL of the `background` image:

```json
{
    "section1": {
        "files":[
            {
                "type": "image",
                "key": "background",
                "url": "assets/background.png?h=226313014646669c2ee7"
            }
        ]
    }
}
```

Note it adds a query string `h=226313014646669c2ee7`.

Additionally, you can process all JavaScript files and replace the URL of the Asset Pack files for an URL with a hash:

The code:

```js
this.load.pack("preloader", "assets/preloader-pack.json")
```

Changes to:

```js
this.load.pack("preloader", "assets/preloader-pack.json?h=7e8b50fa0c74d225fbee")
```

## Usage

Install:

```bash
npm install -g phaser-asset-pack-hashing
```

Run the script with the `--root` (alias `-r`) option (required):

```bash
$ phaser-asset-pack-hashing -r path/to/game/dist/
```

It scans the `path/to/game/dist` folder for Asset Pack files and modify them.

It is important to highlight that this tool should be applied to the distribution build of your game. You should not modify the Pack Files of your working sources.

For enabling the replacement of the Asset Pack files URL in the JavaScript code, use the `--js` (alias `-j`) option:

```bash
$ phaser-asset-pack-hashing -j -r path/to/game/dist/
```
It is possible that you don't need to process the JavaScript files. You can use your build tool for importing static assets like the Asset Pack files.

You can see all options:

```bash
$ phaser-asset-pack-hashing -h
```

## TODO

* Write a tutorial about using this tool and Webpack.