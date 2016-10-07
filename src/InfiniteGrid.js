'use strict';

var _exports = window;

((module, exports, root) => {
    const   _CLASS_TILE = 'IG-tile',
            _ID_MOVER = 'IG-mover',
            _CLASS_TILE_CONTENT = 'IG-tileContent',
            _CLASS_ROW = 'IG-row',
            _CLASS_BEFORE_ROW = 'IG-before',
            _CLASS_AFTER_ROW = 'IG-after';

    const   ROW_TPL = document.createElement('tr'),
            TILE_TPL = document.createElement('td');
    TILE_TPL.classList.add(_CLASS_TILE);

    class InfiniteGrid {
        get dynTileAttr() {
            return {
                'id': `${_CLASS_TILE}${this.count}`,
                'data-id': this.count,
                'html': this.opts.tileTemplate(this.count)
            };
        }

        /**
         * TileTemplate callback
         * @callback tileTemplateCallback
         * @param {number} - tileNumber The tileNumber position
         * @return {String} - The string template of the tile
         */
        /**
         * onRelease callback
         * @callback onReleaseCallback
         */
        /**
         * Construct a new Infinite grid
         *
         * @param {HTMLElement} container - The container element
         * @param {Object} [options] - List of options given to InfiniteGrid
         * @param {number} [options.buffer=4]
         * @param {Object} [options.tileSize] - The tile size inside the grid
         * @param {!number} [options.tileSize.width=100]
         * @param {!number} [options.tileSize.height=75]
         * @param {number} [options.containerSize] - The container size
         * @param {!number} [options.containerSize.width=800]
         * @param {!number} [options.containerSize.height=600]
         * @param {number} [options.limit=300] - The max number of tile created before using cache
         * @param {tileTemplateCallback} [options.tileTemplate] - A function given to generate each tile
         * @param {onReleaseCallback} [options.onRelease] - A function given called when the grid stop moving
         * @param {!HTMLElement} [options.insertBefore] - A function given called when the grid stop moving
         */
        constructor(container, options) {
            this.MOVER = Utils.setAttributes(document.createElement('table'), {'id': _ID_MOVER});
            this.opts = {
                buffer: 4,
                tileSize: {
                    width: 100,
                    height: 75
                },
                containerSize: {
                    width: 800,
                    height: 600
                },
                limit: 300,
                tileTemplate: (tileNumber) => {
                    return `<div
                        style="background: url(http://placehold.it/${this.opts.tileSize.width}x${this.opts.tileSize.height}?text=ID:${tileNumber})"
                        id="${_CLASS_TILE_CONTENT}${tileNumber}"
                        class="${_CLASS_TILE_CONTENT}">&nbsp;</div>`;
                },
                onRelease: () => {},
                insertBefore: null
            };
            if (options) {
                this.opts = Utils.extend(this.opts, options)
            }
            this.container = container;
            if(this.opts.insertBefore ) {
                this.container.insertBefore(this.MOVER, options.insertBefore);
            } else {
                this.container.appendChild(this.MOVER);
            }
            TILE_TPL.style.width = `${this.opts.tileSize.width}px`;
            TILE_TPL.style.height = `${this.opts.tileSize.height}px`;

            this.MAX_BY_LINE = Math.round(this.opts.containerSize.width / this.opts.tileSize.width);
            this.MAX_BY_COLUMN = Math.round(this.opts.containerSize.height / this.opts.tileSize.height);

            this.MOVER.style.width = `${this.opts.containerSize.width + ((this.opts.buffer*2)*this.opts.tileSize.width)}px`;
            this.MOVER.style.height = `${this.opts.containerSize.height + ((this.opts.buffer*2)*this.opts.tileSize.height)}px`;

            Utils.setAttributes(this.MOVER, {
                'data-translatex': -(this.opts.buffer*this.opts.tileSize.width),
                'data-translatey': -(this.opts.buffer*this.opts.tileSize.height),
                'style': {'transform': `translate3d(${-(this.opts.buffer*this.opts.tileSize.width)}px,${-(this.opts.buffer*this.opts.tileSize.height)}px, 0px)`}
            });

            this.count = 0;
            this.cacheTile = [];

            this.lookupIndex = Utils.generateRandomIndexArray(this.opts.limit - ((this.MAX_BY_LINE+(this.opts.buffer*2))*(this.MAX_BY_COLUMN+(this.opts.buffer*2))))();

            this.init();

            /* EVENTS */

            this.dragData = {
                last_spot:{x: 0, y: 0},
                distances:[],
                rads:null,
                offset:null,
                time:null
            };

            this.animation = null;

            this.down = false;
            this.justUpped = false;
            this.baseCoord = {
                x: 0, y: 0,
                translate: {
                    x: parseInt(this.MOVER.getAttribute('data-translatex')),
                    y: parseInt(this.MOVER.getAttribute('data-translatey'))
                }
            };
            this.delta = {x:0,y:0};
            this.newTranslate = this.baseCoord.translate;

            let _subMD = this.onMouseDown,
                _subMU = this.onMouseUp,
                _subMM = this.onMouseMove;
            var that = this;
            this.onmousedownProxy = (e) => {_subMD.call(that, e)};
            this.onmouseupProxy = (e) => {_subMU.call(that, e)};
            this.onmousemoveProxy = (e) => {_subMM.call(that, e)};
            this.initEvents();
            /*--*/

            this.RAFid = null;
            this.prevTranslate = this.newTranslate;
            this.render();
        }

        init() {
            let tempRow = null,
                i, j;

            /* BASE GRID */
            for (i = 0; i < this.MAX_BY_COLUMN; i++) {
                tempRow = Utils.setAttributes(ROW_TPL.cloneNode(false), {id:`${_CLASS_ROW}${i}`});
                for (j = 0; j < this.MAX_BY_LINE; j++) {
                    tempRow.appendChild(
                        Utils.setAttributes(TILE_TPL.cloneNode(false), this.dynTileAttr)
                    );
                    this.count++;
                }
                this.MOVER.appendChild(tempRow);
                tempRow = null;
            }

            /* EXTRA CELLS */
            let leftRightInited = false;
            for (let b = this.opts.buffer; b--;) {
                let tempBeforeRow = Utils.setAttributes(ROW_TPL.cloneNode(false), {'id': `${_CLASS_BEFORE_ROW}${b}`}),
                    tempAfterRow = Utils.setAttributes(ROW_TPL.cloneNode(false), {'id': `${_CLASS_AFTER_ROW}${b}`});

                for (i = 0; i < this.MAX_BY_LINE + (this.opts.buffer * 2); i++) {
                    tempBeforeRow.appendChild(
                        Utils.setAttributes(TILE_TPL.cloneNode(false), this.dynTileAttr)
                    );
                    this.count++;
                    tempAfterRow.appendChild(
                        Utils.setAttributes(TILE_TPL.cloneNode(false), this.dynTileAttr)
                    );
                    this.count++;

                    if (!leftRightInited && i < this.MAX_BY_COLUMN) {
                        let currentRow = document.getElementById(`${_CLASS_ROW}${i}`),
                            first = null;
                        for (let buf = this.opts.buffer; buf--;) {
                            first = currentRow.querySelector('td:first-child');
                            currentRow.insertBefore(
                                Utils.setAttributes(TILE_TPL.cloneNode(false), this.dynTileAttr),
                                first
                            );
                            this.count++;
                            currentRow.insertBefore(
                                Utils.setAttributes(TILE_TPL.cloneNode(false), this.dynTileAttr),
                                null
                            );
                            this.count++;
                        }
                    }
                }
                this.MOVER.insertBefore(tempBeforeRow, this.MOVER.querySelector('tr:first-child'));
                this.MOVER.insertBefore(tempAfterRow, null);
                leftRightInited = true;
            }
        }

        initEvents() {
            // var animateEase = false,
            //     EASE = {
            //         ms: new MouseSpeed,
            //         xSpeed: 0,
            //         ySpeed: 0,
            //         friction: .82,
            //         offsetX: 0,
            //         offsetY: 0
            //     };
            Utils.addEventListenerMulti(this.MOVER, 'mousedown touchstart', this.onmousedownProxy);
            Utils.addEventListenerMulti(document, 'mouseup touchend', this.onmouseupProxy);
            Utils.addEventListenerMulti(document, 'mousemove touchmove', this.onmousemoveProxy);
        }

        destroyEvents() {
            Utils.removeEventListenerMulti(this.MOVER, 'mousedown touchstart', this.onmousedownProxy);
            Utils.removeEventListenerMulti(document, 'mouseup touchend', this.onmouseupProxy);
            Utils.removeEventListenerMulti(document, 'mousemove touchmove', this.onmousemoveProxy);
        }

        /**
         * @param {Event} e
         * @returns {boolean}
         */
        onMouseDown(e) {
            this.down = true;
            this.justUpped = false;

            if(this.animation) {
                this.animation.stop();
            }

            this.baseCoord = {
                x: (e.touches ? e.touches[0] : e).clientX,
                y: (e.touches ? e.touches[0] : e).clientY,
                translate: {
                    x: parseInt(this.MOVER.getAttribute('data-translatex')),
                    y: parseInt(this.MOVER.getAttribute('data-translatey'))
                }
            };

            this.delta = {x: 0, y: 0};

            var offset = {
                x: this.baseCoord.x,
                y: this.baseCoord.y
            };
            this.dragData = {
                time: (new Date).getTime(),
                offset:offset,
                last_spot:offset,
                distances:[],
                rads:[]
            };

            return false;
        }

        /**
         * @param {Event} e
         * @returns {boolean}
         */
        onMouseUp(e) {
            this.down = false;
            this.justUpped = true;

            var touchX = (e.touches ? this.dragData.last_spot.x : e.clientX);
            var touchY = (e.touches ? this.dragData.last_spot.y : e.clientY);

            var duration = ((new Date).getTime() - this.dragData.time);
            var dist = Utils.average(this.dragData.distances.slice(-3)).mean * 10;
            var rad = Utils.average(this.dragData.rads.slice(-3)).mean - Math.PI / 2;

            var to_left = touchX + Math.sin(rad) * (-dist) - this.dragData.offset.x;
            var to_top = touchY + Math.cos(rad) * dist - this.dragData.offset.y;

            if(this.animation){
                this.animation.stop();
            }

            this.animation = new Animate({
                delay:1,
                item:this.delta,
                to:{
                    x:to_left,
                    y:to_top
                },
                duration:duration*2,
                delta:Animate.easeOut(Animate.easeOutCirc)
            });
            this.animation.start();

            Utils.setAttributes(this.MOVER, {
                'data-translatex': this.newTranslate.x,
                'data-translatey': this.newTranslate.y
            });

            return false;
        }

        /**
         * @param {Event} e
         * @returns {boolean}
         */
        onMouseMove(e) {
            if (this.down) {

                var touchX = (e.touches ? e.touches[0] : e).clientX;
                var touchY = (e.touches ? e.touches[0] : e).clientY;

                this.delta = {
                    x: touchX - this.baseCoord.x,
                    y: touchY - this.baseCoord.y
                };

                var dist = Math.sqrt(Math.pow(this.dragData.last_spot.x - touchX, 2) + Math.pow(this.dragData.last_spot.y - touchY, 2));
                this.dragData.distances.push(dist);

                var cur_rad = Math.atan2(touchY - this.dragData.last_spot.y, touchX - this.dragData.last_spot.x);
                this.dragData.rads.push(cur_rad);

                this.dragData.last_spot = {
                    x: touchX,
                    y: touchY
                };

                return false;
            }
            return true;
        }

        //<editor-fold desc="Row manipulators" collapsed="true">
        addTopRow() {
            let row = ROW_TPL.cloneNode(false);
            for (let i = 0; i < this.MAX_BY_LINE + (this.opts.buffer*2); i++) {
                if (this.count < this.limit) {
                    row.appendChild(
                        Utils.setAttributes(TILE_TPL.cloneNode(false), this.dynTileAttr)
                    );
                    this.count++;
                } else {
                    row.appendChild(this.cacheTile.splice(this.lookupIndex.next(), 1)[0]);
                }
            }

            this.baseCoord.translate.y -= this.opts.tileSize.height;
            this.MOVER.insertBefore(row, this.MOVER.querySelector('tr:first-child'));
        }

        removeTopRow() {
            let topRow = this.MOVER.querySelector('tr:first-child');
            this.MOVER.removeChild(topRow);
            this.cacheTile.push(...topRow.querySelectorAll(`.${_CLASS_TILE}`));
        }

        addBottomRow() {
            let row = ROW_TPL.cloneNode(false);
            for (let i = 0; i < this.MAX_BY_LINE + (this.opts.buffer*2); i++) {
                if (this.count < this.limit) {
                    row.appendChild(
                        Utils.setAttributes(TILE_TPL.cloneNode(false), this.dynTileAttr)
                    );
                    this.count++;
                } else {
                    row.appendChild(this.cacheTile.splice(this.lookupIndex.next(), 1)[0]);
                }
            }

            this.baseCoord.translate.y += this.opts.tileSize.height;
            this.MOVER.insertBefore(row, null);
        }

        removeBottomRow() {
            let bottomRow = this.MOVER.querySelector('tr:last-child');
            this.MOVER.removeChild(bottomRow);
            this.cacheTile.push(...bottomRow.querySelectorAll(`.${_CLASS_TILE}`));
        }

        addLeftColumn() {
            let tiles = this.MOVER.querySelectorAll(`tr>td.${_CLASS_TILE}:first-child`),
                tileToAdd = null;
            for (let i = 0; i < this.MAX_BY_COLUMN + (this.opts.buffer*2); i++) {
                if (this.count < this.limit) {
                    tileToAdd = Utils.setAttributes(TILE_TPL.cloneNode(false), this.dynTileAttr);
                    this.count++;
                } else {
                    tileToAdd = this.cacheTile.splice(this.lookupIndex.next(), 1)[0];
                }
                tiles[i].parentNode.insertBefore(tileToAdd, tiles[i]);
            }
            this.baseCoord.translate.x -= this.opts.tileSize.width;
        }

        removeLeftColumn() {
            let leftRow = this.MOVER.querySelectorAll(`tr>td.${_CLASS_TILE}:first-child`);
            leftRow.forEach(el => el.parentNode.removeChild(el));
            this.cacheTile.push(...leftRow);
        }

        addRightColumn() {
            let tiles = this.MOVER.querySelectorAll(`tr>td.${_CLASS_TILE}:last-child`),
                tileToAdd = null;
            for (let i = 0; i < this.MAX_BY_COLUMN + (this.opts.buffer*2); i++) {
                if (this.count < this.limit) {
                    tileToAdd = Utils.setAttributes(TILE_TPL.cloneNode(false), this.dynTileAttr);
                    this.count++;
                } else {
                    tileToAdd = this.cacheTile.splice(this.lookupIndex.next(), 1)[0];
                }
                tiles[i].parentNode.insertBefore(tileToAdd, null);
            }
            this.baseCoord.translate.x += this.opts.tileSize.width;
        }

        removeRightColumn() {
            let rightRow = this.MOVER.querySelectorAll(`tr>td.${_CLASS_TILE}:last-child`);
            rightRow.forEach(el => el.parentNode.removeChild(el));
            this.cacheTile.push(...rightRow);
        }
        //</editor-fold>

        /**
         * Destroy the Infinite grid, including events and requestAnimationFrame loop.
         */
        destroy() {
            this.destroyEvents();
            cancelAnimationFrame(this.RAFid);
            delete this.RAFid;
            for (let i in this.cacheTile) {
                this.cacheTile[i] = null;
                delete this.cacheTile[i];
            }
            this.cacheTile = null;
            delete this.cacheTile;

            this.container.removeChild(this.MOVER);
            this.MOVER = null;
            delete this.MOVER;
            this.container = null;
            delete this.container;
            if(this.animation){
                this.animation.stop();
            }
        }

        render() {
            var that = this;
            var _innerRender = () => {
                this.RAFid = requestAnimationFrame(_innerRender);
                try {

                    if (that.newTranslate.x > -(that.opts.buffer * (that.opts.tileSize.width * (2 / 3)))) {
                        that.removeRightColumn();
                        that.addLeftColumn();
                    } else if (that.newTranslate.x < -(that.opts.buffer * (that.opts.tileSize.width + (that.opts.tileSize.width * (2 / 3))))) {
                        that.removeLeftColumn();
                        that.addRightColumn();
                    }

                    if (that.newTranslate.y > -(that.opts.buffer * (that.opts.tileSize.height * (2 / 3)))) {
                        that.removeBottomRow();
                        that.addTopRow();
                    } else if (that.newTranslate.y < -(that.opts.buffer * (that.opts.tileSize.height + (that.opts.tileSize.height * (2 / 3))))) {
                        that.removeTopRow();
                        that.addBottomRow();
                    }

                    that.newTranslate = {
                        x: that.baseCoord.translate.x + that.delta.x,
                        y: that.baseCoord.translate.y + that.delta.y
                    };

                    if (that.newTranslate.x !== that.prevTranslate.x || that.newTranslate.y !== that.prevTranslate.y) {
                        that.MOVER.style['transform'] = `translate3d(${that.newTranslate.x}px,${that.newTranslate.y}px, 0px)`;
                        that.prevTranslate = that.newTranslate;

                        Utils.setAttributes(that.MOVER, {
                            'data-translatex': that.newTranslate.x,
                            'data-translatey': that.newTranslate.y
                        });
                    } else {
                        if (that.justUpped) {
                            that.opts.onRelease && that.opts.onRelease();
                        }
                        that.justUpped = false;
                    }
                } catch(e) {
                    console.error(e);
                    cancelAnimationFrame(that.RAFid);
                    throw e;
                }
            };
            _innerRender();
        }
    }

    /**
     * Animation tween & ease
     */
    class Animate {

        constructor(opts){
            this.opts  = opts;
            this.timer = 0;
        }

        start()
        {
            this.from = {};
            for(var b in this.opts.to)
            {
                this.from[b] = parseInt(this.opts.item[b]);
            }
            this.animate();
        }

        step(delta)
        {
            for(var b in this.opts.to) {
                var v = Animate.delayer(this.opts.to[b],this.from[b],delta);
                if(!isNaN(v)){
                    this.opts.item[b] = v;
                }
            }
        }

        stop()
        {
            if(this.timer) {
                clearInterval(this.timer)
            }
        }

        animate() {
            var start = (new Date).getTime();

            this.timer = setInterval(function(scope) {
                var timePassed = (new Date).getTime() - start;
                var progress = timePassed / scope.opts.duration;
                if (progress > 1) {
                    progress = 1;
                }
                var delta = scope.opts.delta(progress);
                scope.step(delta);

                if (progress == 1) {
                    scope.stop();
                }
            }, this.opts.delay || 10, this);
        }

        static easeOut(delta) {
            return function(progress) {
                return 1 - delta(1 - progress);
            }
        }

        static easeOutCirc(progress) {
            return 1 - Math.sin(Math.acos(progress))
        }

        static delayer(target,source,delay) {
            return ((delay * (target-source)) + source);
        }
    }

    class Utils {
        /**
         * Set multiple attributes to one element
         *
         * @param {HTMLElement|Node} el
         * @param {*} attr
         * @returns {HTMLElement}
         */
        static setAttributes(el, attr) {
            for (let idx in attr) {
                if (attr.hasOwnProperty(idx)) {
                    if ((idx === 'styles' || idx === 'style') && typeof attr[idx] === 'object') {
                        for (let prop in attr[idx]) {
                            if (attr[idx].hasOwnProperty(prop)) {
                                el.style[prop] = attr[idx][prop];
                            }
                        }
                    } else if (idx === 'html') {
                        el.innerHTML = attr[idx];
                    } else {
                        el.setAttribute(idx, attr[idx]);
                    }
                }
            }

            return el;
        }

        /**
         * Set a function on multiple event to one element
         *
         * @param {HTMLElement|Node} el
         * @param {String} events
         * @param {Function} fn
         * @returns {HTMLElement}
         */
        static addEventListenerMulti(el, events, fn) {
            events.split(' ').forEach(e => el.addEventListener(e, fn, false));

            return el;
        }

        /**
         * Set a function on multiple event to one element
         *
         * @param {HTMLElement|Node} el
         * @param {String} events
         * @param {Function} fn
         * @returns {HTMLElement}
         */
        static removeEventListenerMulti(el, events, fn) {
            events.split(' ').forEach(e => el.removeEventListener(e, fn));

            return el;
        }

        /**
         * Generate an array of random plain integer which never be greter than maxIndex.
         * Give an generator function in return.
         *
         * @param {Number} maxIndex
         * @returns {Function}
         */
        static generateRandomIndexArray(maxIndex) {
            setTimeout(()=> {
                if(Utils.THE_RANDOM_ARRAY.length) {
                    Utils.THE_RANDOM_ARRAY = [];
                    Utils.RANDOM_INDEX = Utils.RANDOM_SIZE_REFERENCE;
                }
                for (; Utils.RANDOM_INDEX--;) {
                    Utils.THE_RANDOM_ARRAY.push(Math.random()*maxIndex|0);
                }
            },1);

            return function* () {
                while(1) {
                    if (Utils.RANDOM_INDEX++ >= Utils.THE_RANDOM_ARRAY.length) Utils.RANDOM_INDEX = 0;
                    yield Utils.THE_RANDOM_ARRAY[Utils.RANDOM_INDEX];
                }

            }
        }
        /**
         * Extends a target basic object with one or more sources.
         *
         * @param {*} target
         * @param {...*} sources
         * @return {*}
         */
        static extend(target, ...sources) {
            if (!!Object.assign) {
                return Object.assign(target, ...sources);
            } else {
                for (let source of sources) {
                    for (let key in source) {
                        if (Object.prototype.hasOwnProperty.call(source, key)) {
                            target[key] = source[key];
                        }
                    }
                }
                return target;
            }
        }

        static average(a) {
            var r = {
                mean: 0,
                variance: 0,
                deviation: 0
            }, t = a.length;
            for (var m, s = 0, l = t; l--; s += a[l]) {}
            for (m = r.mean = s / t, l = t, s = 0; l--; s += Math.pow(a[l] - m, 2)) {}
            return r.deviation = Math.sqrt(r.variance = s / t), r;
        }
    }
    Utils.THE_RANDOM_ARRAY = [];
    Utils.RANDOM_SIZE_REFERENCE = 1e6;
    Utils.RANDOM_INDEX = Utils.RANDOM_SIZE_REFERENCE;

    InfiniteGrid.Utils = Utils;
    InfiniteGrid.Animate = Animate;
    exports.InfiniteGrid = InfiniteGrid;
})(_exports, _exports, window);