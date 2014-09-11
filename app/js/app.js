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

    Vector.getSquaredDistance = function (p1, p2) {
        return p1.sub(p2).getSquaredLength();
    };

    var vecproto = Vector.prototype;

    vecproto.clone = function () {
        return new this.constructor(this.x, this.y);
    };

    vecproto._addCoords = function (x, y) {
        this.x += x;
        this.y += y;
        return this;
    };

    vecproto._add = function (b) {
        return this._addCoords(b.x, b.y);
    };

    vecproto._sub = function (b) {
        return this._addCoords(-b.x, -b.y);
    };

    vecproto._scalarMul = function (c) {
        this.x *= c;
        this.y *= c;
        return this;
    };

    vecproto.reset = function () {
        this.x = 0;
        this.y = 0;
        return this;
    };

    vecproto.add = function (b) {
        return this.clone()._add(b);
    };

    vecproto.sub = function (b) {
        return this.clone()._sub(b);
    };

    vecproto.scalarMul = function (c) {
        return this.clone()._scalarMul(c);
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
        this.disposed = false;
    }

    var gameobjproto = GameObj.prototype;

    gameobjproto.color = 'rgb(255,255,255)';

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

    gameobjproto.collidesWithObj = function (obj) {
        var rsum = obj.r + this.r;
        var rsumSquared = rsum * rsum;
        return Vector.getSquaredDistance(obj.pos, this.pos) < rsumSquared;
    };

    gameobjproto.attack = function (obj, attackPoints) {
        // "mediating" the attack
        this.level.attack(this, obj, attackPoints);
    };

    gameobjproto.decreaseHealth = function (damagePoints) {
    };

    gameobjproto._markDisposed = function () {
        this.disposed = true;
    };



    function Bullet(level, pos, move, sender, attackPoints) {
        GameObj.call(this, level, pos, 2);
        this.move = move;
        this.sender = sender;
        this.attackPoints = attackPoints;
    }

    var bulletproto = Bullet.prototype = Object.create(GameObj.prototype);

    bulletproto.color = 'rgb(255,255,0)';

    bulletproto.react = function () {

        var i, objects = [this.level.player].concat(this.level.enemies);

        for (i = 0; i < objects.length; i++) {
            if (this.collidesWithObj(objects[i])) {
                this.sender.attack(objects[i], this.attackPoints);
                this.move.reset();
            }
        }

        if (this.move.isZero()) {
            this._markDisposed();
        }
    };



    function AliveObj() {
        GameObj.apply(this, arguments);
        this.health = 100;
    }

    var aliveobjproto = AliveObj.prototype = Object.create(GameObj.prototype);

    aliveobjproto.decreaseHealth = function (damagePoints) {

        if (this.health <= damagePoints) {
            this.health = 0;
            this._markDisposed();
        } else {
            this.health -= damagePoints;
        }
    };



    function Enemy(level, pos) {
        AliveObj.call(this, level, pos, 10);
    }

    var enemyproto = Enemy.prototype = Object.create(AliveObj.prototype);

    enemyproto.color = 'rgb(0,0,255)';


    function MeleeEnemy(level, pos) {
        Enemy.call(this, level, pos);
    }

    var meleeenemyproto = MeleeEnemy.prototype = Object.create(Enemy.prototype);

    meleeenemyproto.react = function () {
        var player = this.level.player;
        if (this.collidesWithObj(player)) {
            this.attack(player, 20);
        }

    };



    function Player(level, pos) {
        AliveObj.call(this, level, pos, 10);
        this.reloadCount = 0;
        this.rangedAttackPoints = 20;
    }

    var playerproto = Player.prototype  = Object.create(AliveObj.prototype);

    playerproto.color = 'rgb(255,0,0)';

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
            bulletPos = this.pos.add(normalizedMove.scalarMul(this.r * 1.5));
            bulletMove = normalizedMove.scalarMul(15);
            bullet = new Bullet(this.level, bulletPos, bulletMove, this, this.rangedAttackPoints);
            this.level.bullets.push(bullet);
            this.reloadCount = 10;
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


    cellproto.getHashKey = function () {
        return this.i + 'x' + this.j;
    };

    cellproto.getCenterPoint = function () {
        var w = this.level.cellWidth;
        return new Vector(w * (this.i + 0.5), w * (this.j + 0.5));
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

        if (numCellRows % 2 === 0 || numCellCols % 2 === 0) {
            throw "Gimme odd numbers";
        }

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
        this.enemies = [];
        this.player = new Player(this, cells[1][1].getCenterPoint());
        this.generate();
    }

    var levproto = Level.prototype;

    levproto.generate = function () {
        var cells = this.cells;
        var rowH = (this.numCellRows / 2) | 0, colH = (this.numCellCols / 2) | 0;
        var i, j, k, enemy;
        var randint = function (n) {
            return (Math.random() * n) | 0;
        };
        for (k = 0; k < rowH * colH; k++) {
            i = randint(colH - 1) * 2 + 2;
            j = randint(rowH - 1) * 2 + 2;
            cells[j][i].type = CELL_WALL;
        }

        for (k = 0; k < rowH * colH * 2; k++) {
            i = randint(colH) * 2 + 1;
            j = randint(rowH - 1) * 2 + 2;
            if (!(cells[j][i - 1].type === CELL_WALL && cells[j][i + 1].type === CELL_WALL)) {
                continue;
            }
            cells[j][i].type = CELL_WALL;
            if (!this.areCellsConnected()) {
                cells[j][i].type = CELL_EMPTY;
                continue;
            }
        }

        for (k = 0; k < rowH * colH * 2; k++) {
            i = randint(colH - 1) * 2 + 2;
            j = randint(rowH) * 2 + 1;
            if (!(cells[j - 1][i].type === CELL_WALL && cells[j + 1][i].type === CELL_WALL)) {
                continue;
            }
            cells[j][i].type = CELL_WALL;
            if (!this.areCellsConnected()) {
                cells[j][i].type = CELL_EMPTY;
                continue;
            }
        }

        var numOfMeleeEnemies = 10;

        for (k = 0; k < numOfMeleeEnemies; k++) {
            i = randint(colH) * 2 + 1;
            j = randint(rowH) * 2 + 1;

            enemy = new MeleeEnemy(this, cells[j][i].getCenterPoint());

            this.enemies.push(enemy);
        }


    };

    levproto.cellBFS = function (startCell) {
        var cells = this.cells;
        var visited = {};
        var distances = {};
        var queue = [];
        var elem;
        var key;

        var getNextCells = function (cell) {
            var i = cell.i, j=cell.j;
            return [
                cells[j - 1][i],
                cells[j][i - 1],
                cells[j + 1][i],
                cells[j][i + 1]
            ].filter(function (elem) {
                return elem && elem.type !== CELL_WALL;
            });
        };

        var getNextElements = function (elem) {
            return getNextCells(elem[0]).map(function(cell) {
                return [cell, elem[1] + 1];
            });
        };


        queue.push([startCell, 0]);

        while(queue.length > 0) {
            elem = queue.shift();
            key = elem[0].getHashKey();
            if (!visited[key]) {
                distances[key] = elem[1];
                visited[key] = true;
                Array.prototype.push.apply(queue, getNextElements(elem));
            }
        }

        return distances;
    };

    levproto.eachCell = function (cb) {
        var i, j;
        for (j = 0; j < this.numCellRows; j++) {
            for (i = 0; i < this.numCellCols; i++) {
                cb(this.cells[j][i]);
            }
        }
    };

    levproto.getAllCells = function () {
        var cells = [];
        this.eachCell(function (cell) {
            cells.push(cell);
        });
        return cells;
    };

    levproto.areCellsConnected = function () {
        var distances = this.cellBFS(this.cells[1][1]);

        return this.getAllCells().filter(function (cell) {
            return cell.type != CELL_WALL;
        }).every(function (cell) {
            return typeof distances[cell.getHashKey()] !== 'undefined';
        });
    };

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
        for (i = 0; i < this.enemies.length; i++) {
            this.enemies[i].render();
        }
        ctx.restore();
    };

    levproto.mapObjToCell = function (obj) {
        var i = (obj.pos.x / this.cellWidth);
        var j = (obj.pos.y / this.cellWidth);
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
        var i, objects = [this.player].concat(this.bullets, this.enemies);
        for (i = 0; i < objects.length; i++) {
            this.checkObjCollisions(objects[i]);
        }
    };

    levproto.react = function () {
        var i, objects = [].concat(this.bullets, this.enemies);
        this.player.react(actions);
        for (i = 0; i < objects.length; i++) {
            objects[i].react();
        }
    };

    levproto.advance = function () {
        var i, objects = [this.player].concat(this.bullets, this.enemies);
        for (i = 0; i < objects.length; i++) {
            objects[i].advance();
        }
    };

    levproto.disposeObjectsInArray = function (arr) {
        var i;
        for (i = 0; i < arr.length; i++) {
            if (arr[i].disposed){
                arr.splice(i, 1);
                --i;
            }
        }
    };

    levproto.disposeObjects = function () {
        this.disposeObjectsInArray(this.bullets);
        this.disposeObjectsInArray(this.enemies);
    };

    levproto.tick = function () {
        this.react();
        this.checkCollisions();
        this.advance();
        this.disposeObjects();
    };

    levproto.attack = function (attackingObj, attackedObj, attackPoints) {
        console.log(attackingObj, ' attacked ', attackedObj, ' with ', attackPoints);
        attackedObj.decreaseHealth(attackPoints);
    };



    var canvas = document.getElementById('canvas');
    var bufferCanvas = root.document.createElement('canvas');
    var ctx = bufferCanvas.getContext('2d');
    var directCtx = canvas.getContext('2d');
    var width = 800, height = 600;
    bufferCanvas.width = width;
    bufferCanvas.height = height;

    var level = new Level(33, 31, 50);

    function animLoop() {
        root.requestAnimationFrame(animLoop);
        render();
    }

    function render() {
        level.render();
    }

    function doLoop() {
        setInterval(function () {
            level.tick();
        }, 16);
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

    doLoop();
    animLoop();

    root.Vector = Vector;


}).call(this);
