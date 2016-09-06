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
         */
        constructor(container, options) {
            this.MOVER = Utils.setAttributes(document.createElement('table'), {'id': _ID_MOVER});
            container.appendChild(this.MOVER);
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
                onRelease: () => {}
            };
            if (options) {
                this.opts = Utils.extend(this.opts, options)
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
            Utils.addEventListenerMulti(this.MOVER, 'mousedown touchstart', e => {
                this.down = true;
                this.justUpped = false;
                this.baseCoord = {
                    x: (e.touches ? e.touches[0] : e).clientX,
                    y: (e.touches ? e.touches[0] : e).clientY,
                    translate: {
                        x: parseInt(this.MOVER.getAttribute('data-translatex')),
                        y: parseInt(this.MOVER.getAttribute('data-translatey'))
                    }
                };
                this.delta = {x:0,y:0};

                // EASE.offsetX = baseCoord.translate.x;
                // EASE.offsetY = baseCoord.translate.y;
                // animateEase = false;
                // clearTimeout(time);
                // time = null;

                return false;
            });
            Utils.addEventListenerMulti(this.MOVER, 'mouseup touchend', e => {
                this.down = false;
                this.justUpped = true;

                Utils.setAttributes(this.MOVER, {
                    'data-translatex': this.newTranslate.x,
                    'data-translatey': this.newTranslate.y
                });
                return false;
            });
            Utils.addEventListenerMulti(this.MOVER, 'mousemove touchmove', e => {
                if (this.down) {
                    this.delta = {
                        x: (e.touches ? e.touches[0] : e).clientX - this.baseCoord.x,
                        y: (e.touches ? e.touches[0] : e).clientY - this.baseCoord.y
                    };

                    // EASE.ms.tick(newTranslate.x, newTranslate.y);
                    return false;
                }
                return true;
            });
        }

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

        // launchEase() {
        //     // this.animateEase = true;
        //     //
        //     // this.EASE.xSpeed = EASE.ms.xSpeed;
        //     // EASE.ySpeed = EASE.ms.ySpeed;
        //     // console.log('launchEase', EASE);
        // }
        //
        // doEase() {
        //     // let time = null;
        //     // var doEase = () => { // RAF
        //     //     console.log('doEase');
        //     //
        //     //     delta.x += EASE.xSpeed;
        //     //     delta.y += EASE.ySpeed;
        //     //
        //     //     EASE.xSpeed *= EASE.friction;
        //     //     EASE.ySpeed *= EASE.friction;
        //     //     if (time == null) {
        //     //         time = setTimeout(()=> {
        //     //             animateEase = false;
        //     //             time = null;
        //     //         }, 2000);
        //     //     }
        //     //
        //     // };
        // }

        render() {
            var that = this;
            var _innerRender = () => {
                this.RAFid = requestAnimationFrame(_innerRender);
                try {
                    // if (justUpped && !animateEase) {
                    //     launchEase();
                    // } else if (animateEase) {
                    //     doEase();
                    // }

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
                    // EASE.ms.tick(newTranslate.x, newTranslate.y);

                    if (that.newTranslate.x !== that.prevTranslate.x || that.newTranslate.y !== that.prevTranslate.y) {
                        that.MOVER.style['transform'] = `translate3d(${that.newTranslate.x}px,${that.newTranslate.y}px, 0px)`;
                        that.prevTranslate = that.newTranslate;
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
         * Generate an array of random plain integer which never be greter than maxIndex.
         * Give an generator function in return.
         *
         * @param {Number} maxIndex
         * @returns {Function}
         */
        static generateRandomIndexArray(maxIndex) {
            setTimeout(()=> {
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
    }
    Utils.THE_RANDOM_ARRAY = [];
    Utils.RANDOM_INDEX = 1e6;

    InfiniteGrid.Utils = Utils;
    exports.InfiniteGrid = InfiniteGrid;
})(_exports, _exports, window);