(function () {
    "use strict";
    var root = this;
    var sqrtOf2 = Math.sqrt(2);

    function Vector(x, y) {
        this.x = x;
        this.y = y;
    }

    Vector.zero = function () {
        return new this(0, 0);
    };

    var vecproto = Vector.prototype;

    vecproto._addCoords = function (x, y) {
        this.x += x;
        this.y += y;
        return this;
    };

    vecproto._add = function (b) {
        return this._addCoords(b.x, b.y);
    };

    vecproto._scalarMul = function (c) {
        this.x *= c;
        this.y *= c;
        return this;
    };

    vecproto.reset = function () {
        this.x = 0;
        this.y = 0;
    };

    vecproto.add = function (b) {
        return new this.constructor(this.x + b.x, this.y + b.y);
    };

    vecproto.scalarMul = function (c) {
        return new this.constructor(c * this.x, c * this.y);
    };

    vecproto.neg = function () {
        return new this.constructor(-this.x, -this.y);
    };

    vecproto.getSquaredLength = function () {
        return this.x * this.x + this.y * this.y;
    };

    vecproto.getLength = function () {
        return Math.sqrt(this.getSquaredLength());
    };

    vecproto.isZero = function () {
        return this.x === 0 && this.y === 0;
    };

    vecproto.toString = function () {
        return '(' + this.x + ', ' + this.y + ')';
    };



    function Rect(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.x2 = x + width;
        this.y2 = y + height;
    }

    var rectproto = Rect.prototype;

    rectproto.collidesWithPoint = function (pos) {
        return (this.x <= pos.x && pos.x <= this.x + this.width &&
                this.y <= pos.y && pos.y <= this.y + this.height);
    };

    rectproto._loadCollisionVector = function (vec, pos) {
        vec.x = (pos.x < this.x ? pos.x - this.x : (this.x2 < pos.x ? pos.x - this.x2 : 0));
        vec.y = (pos.y < this.y ? pos.y - this.y : (this.y2 < pos.y ? pos.y - this.y2 : 0));
        return vec;
    };



    function GameObj(level, pos, r) {
        this.level = level;
        this.pos = pos;
        this.move = Vector.zero();
        this.r = r;
    }

    var gameobjproto = GameObj.prototype;

    gameobjproto.color = 'rgb(255,0,0)';

    gameobjproto.render = function () {
        var pos = this.pos;
        var r = this.r;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r, 0, 2 * Math.PI);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();
    };

    gameobjproto.advance = function () {
        this.pos._add(this.move);
    };

    gameobjproto.react = function () {
    };



    function Bullet(level, pos, move) {
        GameObj.call(this, level, pos, 2);
        this.move = move;
    }

    var bulletproto = Bullet.prototype = Object.create(GameObj.prototype);

    bulletproto.color = 'rgb(255,255,0)';



    function Player(level, pos) {
        GameObj.call(this, level, pos, 10);
        this.reloadCount = 0;
    }

    var playerproto = Player.prototype  = Object.create(GameObj.prototype);

    playerproto.react = function (actions) {
        var moveDistance = 5, bullet, bulletPos, bulletMove, normalizedMove,
            move = Vector.zero();

        if (actions[MOVE_UP]) {
            move._addCoords(0, -moveDistance);
        }
        if (actions[MOVE_DOWN]) {
            move._addCoords(0, moveDistance);
        }
        if (actions[MOVE_LEFT]) {
            move._addCoords(-moveDistance, 0);
        }
        if (actions[MOVE_RIGHT]) {
            move._addCoords(moveDistance, 0);
        }

        if (move.getSquaredLength() === 2 * moveDistance * moveDistance) {
            move._scalarMul(1 / sqrtOf2);
        }

        this.move._scalarMul(0.6);
        this.move._add(move);

        if (actions[FIRE] && this.reloadCount === 0) {
            normalizedMove = this.move.scalarMul(1.0 / this.move.getLength());
            bulletPos = this.pos.add(normalizedMove.scalarMul(this.r));
            bulletMove = normalizedMove.scalarMul(15);
            bullet = new Bullet(this.level, bulletPos, bulletMove);
            this.level.bullets.push(bullet);
            this.reloadCount = 10;
            dupcia = 0;
        }

        if (this.reloadCount > 0) {
            --this.reloadCount;
        }
    };



    function Cell(level, i, j, type) {
        this.objs = [];
        this.type = type;
        this.level = level;
        this.i = i;
        this.j = j;
        this.rect = new Rect(i * level.cellWidth, j * level.cellWidth,
                             level.cellWidth, level.cellWidth);
    }

    var cellproto = Cell.prototype;

    cellproto.render = function () {
        var cellWidth = this.level.cellWidth;
        var i = this.i, j = this.j;
        if (this.type === CELL_WALL) {
            ctx.fillStyle = "rgb(127,127,127)";
        } else {
            ctx.fillStyle = "rgb(0,0,0)";
        }
        ctx.fillRect(i * cellWidth, j * cellWidth, cellWidth, cellWidth);
    };

    var CELL_WALL = 'wall';
    var CELL_EMPTY = 'empty';

    var MOVE_UP = 'move-up';
    var MOVE_DOWN = 'move-down';
    var MOVE_LEFT = 'move-left';
    var MOVE_RIGHT = 'move-right';
    var FIRE = 'fire';

    var keyMap = {
        37: MOVE_LEFT,
        38: MOVE_UP,
        39: MOVE_RIGHT,
        40: MOVE_DOWN,
        65: FIRE,
    };

    var actions = {};



    function Level(numCellRows, numCellCols, cellWidth) {
        var cells = [];
        var cellRow;
        var i, j;

        this.cellWidth = cellWidth;
        this.numCellRows = numCellRows;
        this.numCellCols = numCellCols;

        for(j = 0; j < numCellRows; j++) {
            cellRow = [];
            for (i = 0; i < numCellCols; i++) {
                cellRow.push(new Cell(this, i, j, CELL_EMPTY));
            }
            cells.push(cellRow);
        }

        for(j = 0; j < numCellRows; j++) {
            cells[j][0].type = CELL_WALL;
            cells[j][numCellCols - 1].type = CELL_WALL;
        }
        for(i = 0; i < numCellCols; i++) {
            cells[0][i].type = CELL_WALL;
            cells[numCellRows - 1][i].type = CELL_WALL;
        }
        this.cells = cells;
        this.bullets = [];
        this.player = new Player(this,
                                 new Vector(cellWidth * 1.5, cellWidth * 1.5));
    }

    var levproto = Level.prototype;

    levproto.render = function () {
        var i, j;
        directCtx.drawImage(bufferCanvas, 0, 0);
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, height);
        ctx.save();
        ctx.translate(width / 2 - this.player.pos.x | 0,
                      height / 2 - this.player.pos.y | 0);
        for (j = 0; j < this.numCellRows; j++) {
            for (i = 0; i < this.numCellCols; i++) {
                this.cells[j][i].render();
            }
        }
        this.player.render();
        for (i = 0; i < this.bullets.length; i++) {
            this.bullets[i].render();
        }
        ctx.restore();
    };

    levproto.checkObjCollisions = function (obj) {
        var i, j, cell, vec = Vector.zero(),
            nextpos = obj.pos.add(obj.move), rsq = obj.r * obj.r;
        for (j = 0; j < this.numCellRows; j++) {
            for (i = 0; i < this.numCellCols; i++) {
                cell = this.cells[j][i];
                if (cell.type !== CELL_WALL) {
                    continue;
                }
                cell.rect._loadCollisionVector(vec, nextpos);
                if (vec.getSquaredLength() <= rsq) {
                    obj.move.reset();
                    return;
                }
            }
        }

    };

    levproto.checkCollisions = function () {
        var i;
        this.checkObjCollisions(this.player);
        for (i = 0; i < this.bullets.length; i++) {
            this.checkObjCollisions(this.bullets[i]);
        }
    };

    levproto.react = function () {
        this.player.react(actions);
    };

    levproto.advance = function () {
        var i, bullets = this.bullets;
        this.player.advance();
        for (i = 0; i < bullets.length; i++) {
            bullets[i].advance();
            if (bullets[i].move.isZero()) {
                bullets.splice(i, 1);
                --i;
            }
        }

    };



    var canvas = document.getElementById('canvas');
    var bufferCanvas = root.document.createElement('canvas');
    var ctx = bufferCanvas.getContext('2d');
    var directCtx = canvas.getContext('2d');
    var width = 800, height = 600;
    bufferCanvas.width = width;
    bufferCanvas.height = height;

    var level = new Level(40, 40, 50);

    function animLoop() {
        root.requestAnimationFrame(animLoop);
        render();
    }

    function render() {
        level.render();
    }

    function doLoop() {
        level.react();
        level.checkCollisions();
        level.advance();
    }

    window.addEventListener('keyup', function (e) {
        var keyCode = e.which || e.keyCode;
        if (keyMap[keyCode]) {
            actions[keyMap[keyCode]] = false;
        }
    }, false);

    window.addEventListener('keydown', function (e) {
        var keyCode = e.which || e.keyCode;
        if (keyMap[keyCode]) {
            actions[keyMap[keyCode]] = true;
        }
    }, false);

    setInterval(doLoop, 16);
    animLoop();

    root.Vector = Vector;


}).call(this);
