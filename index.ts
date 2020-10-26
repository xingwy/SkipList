type Comparator<T> = (l: T, r: T) => number;
const enum SEARCH_TYPE {
    SEARCH = 1,
    SEARCH_v1 = 2,
    INSEAT = 3,
}

class SkipListLayer<K, T> {
    // 同层后置置指针
    private _next: SkipListNode<K, T>;
    private _span: number;
    constructor(next: SkipListNode<K, T> = null){
        this._next = next;
        this._span = 0;
    }
    public set next(_v: SkipListNode<K, T>) {
        this._next = _v;
    }
    public get next(): SkipListNode<K, T> {
        return this._next;
    }
    public addSpan(): void {
        this._span++;
    }
    public delSpan(): void {
        if (this._span > 0) this._span--;
    }
    public getSpan(): number {
        return this._span;
    }
    public isTail(): boolean {
        return this._next == null;
    }
}

class SkipListNode<K, T> {
    private _k: K;
    private _v: T;
    // 层信息
    private _layers: Array<SkipListLayer<K, T>>;
    private _backward: SkipListNode<K, T>;
    public get k(): K {
        return this._k;
    }
    public get v(): T {
        return this._v;
    }
    public get layers(): Array<SkipListLayer<K, T>> {
        return this._layers;
    }
    public set backward(v: SkipListNode<K, T>) {
        this._backward = v;
    }
    public get backward(): SkipListNode<K, T> {
        return this._backward;
    }

    constructor(k: K, v: T) {
        this._k = k;
        this._v = v;
        this._layers = new Array<SkipListLayer<K, T>>();
    }
    public isHead(): boolean {
        return this._backward == null;
    }
    public getMaxLayer(): number {
        return this._layers.length;
    }
    public next(level: number = 0): SkipListNode<K, T> {
        if (!this._layers[level] || !this._layers[level].next) {
            return null;
        }
        return this._layers[level].next;
    }
    public setNext(_v: SkipListNode<K, T>, level: number = 0): void {
        this._layers[level].next = _v;
    }
}

export class SkipList<K, V> {
    /**
     * K 作为score
     * V 作为实际值
     */
    private _head: SkipListNode<K, V>;
    // 表中节点的数量
    private _length: number;
    // 表中层数最大的节点层数
    private _max_level: number;
    private readonly _comparator: Comparator<K>;
    constructor(comparator: Comparator<K>, maxLevel: number = 16) {
        this._head = new SkipListNode<K, V>(null, null);
        this._comparator = comparator;
        // this._equalator = equalator;
        this._max_level = maxLevel;
        this._length = 0;
    }

    public getHead(): SkipListNode<K, V> {
        return this._head;
    }

    public slFree(): void {
        this._head = null
        return;
    }

    public getSize(): number {
        return this._length;
    }
    /**
     * 获取排行
     * @param k 
     */
    public getRank(k: K): number {
        if (this.search(k) == null) {
            return -1;
        }
        let rank: number = 0;
        let startNode = this._head;
        for (let curLvl = this._head.getMaxLayer() - 1; curLvl >= 0; curLvl--) {
            let curNode = startNode;
            while (true) {
                let nextNode = curNode.layers[curLvl] && curNode.layers[curLvl].next;
                if (!nextNode) {
                    break;
                } else {
                    let result = this.compare(k, nextNode.k);
                    if (result > 0) {
                        startNode = curNode;
                        break;
                    } else {
                        curNode = nextNode;
                        if (curLvl == 0) {
                            rank++;
                        } else {
                            rank += curNode.layers[curLvl].getSpan();
                        }
                        
                    }
                }
            }
        }
        return rank;
    }
    /**
     * 随机种子
     */
    private _random(): boolean {
        return Math.random() > 0.5;
    }
    /**
     * 比较器 结果为负数 【cur】节点在【target】节点前
     * @param cur 当前传入值
     * @param target  目标值
     */
    private compare(cur: K, target: K): number {
        if (!target) {
            return -1;
        }
        return this._comparator(cur, target);
    }
    /**
     * 新增数据
     * @param k 
     * @param v 
     */
    public slInsert(k: K, v: V): void {
        let newNode = new SkipListNode(k, v);
        let backstack = this.getIndexs(k, SEARCH_TYPE.INSEAT);
        let lvl: number = 0;
        do {
            let prev = backstack[lvl] || this._head;
            // 维护多级索引
            if (prev.layers[lvl]) {
                if (prev.layers[lvl].next) {
                    newNode.layers[lvl] = new SkipListLayer(prev.layers[lvl].next);
                } else {
                    newNode.layers[lvl] = new SkipListLayer();
                }
            } else {
                newNode.layers[lvl] = new SkipListLayer();
            }
            prev.layers[lvl] = new SkipListLayer(newNode);

            // 更新backward
            if (lvl == 0) {
                newNode.backward = prev;
                if (prev.next()) {
                    prev.next().backward = newNode;
                }
            }
            ++lvl;
        } while(this._random() && lvl <= this._max_level);

        for (let i=1; i<backstack.length; i++) {
            let prev = backstack[i];
            prev.layers[i].addSpan();
        }
        this._length++;
    }

    /**
     * 删除数据
     * @param k 
     */
    public slRemove(k: K): SkipListNode<K, V> {
        let node = this.search(k);
        if (!node) {
            return null;
        }
        let lvl: number = 0;
        let backstack = this.getIndexs(k, SEARCH_TYPE.SEARCH_v1);
        for (; lvl < backstack.length; lvl++) {
            backstack[lvl].layers[lvl].delSpan()
            if (lvl == 0) {
                backstack[lvl].layers[lvl].next = node.next();
            } else {
                if (backstack[lvl].layers[lvl].next == node) {
                    backstack[lvl].layers[lvl].next = node.layers[lvl].next;
                } else {
                    break;
                }
            }
        }
        this._length--;
        return node;
    }

    /**
     * 获取目前所有级别是索引
     * @param start 
     * @param k 
     * @param lvl 
     */
    public getIndexs(k: K, search: SEARCH_TYPE = SEARCH_TYPE.SEARCH): Array<SkipListNode<K, V>> {
        let backstack = new Array<SkipListNode<K, V>>();
        let startNode = this._head;
        for (let curLvl = this._head.getMaxLayer() - 1; curLvl >= 0; curLvl--) {
            startNode = this.getIndex(startNode, k, curLvl, search);
            backstack[curLvl] = startNode;
        }
        return backstack;
    }

    /**
     * 寻找某个节点在现有索引的归属层
     * @param start 
     */
    public getIndex(start: SkipListNode<K, V>, k: K, lvl: number, search: SEARCH_TYPE = SEARCH_TYPE.SEARCH): SkipListNode<K, V> {
        let curNode = start;
        if (!curNode) {
            return null;
        }
        while (true) {
            let nextNode = curNode.layers[lvl] && curNode.layers[lvl].next;
            if (!nextNode) {
                return curNode;
            } else {
                let result = this.compare(k, nextNode.k);
                if (search == SEARCH_TYPE.INSEAT) {
                    if (result > 0) {
                        return curNode;
                    } else {
                        curNode = nextNode;
                    }
                } else if (search == SEARCH_TYPE.SEARCH_v1) {
                    if (result >= 0) {
                        return curNode;
                    } else {
                        curNode = nextNode;
                    }
                } else if(search == SEARCH_TYPE.SEARCH) {
                    if (result > 0) {
                        return curNode;
                    } else {
                        curNode = nextNode;
                    }
                }
            }
        }
    }

    /**
     * 根据k值搜索第一个条件值
     * @param start 
     */
    public search(k: K): SkipListNode<K, V> {
        let curr = this._head;
        let maxLayer = this._head.getMaxLayer() - 1;
        while(curr) {
            let next = curr.layers[maxLayer].next;
            if (maxLayer == 0) {
                if (this.compare(k, curr.k) > 0) {
                    return null;
                } else if (this.compare(k, curr.k) == 0) {
                    return curr;
                } else {
                    curr = curr.next();  
                }
            } else {
                if (this.compare(k, curr.k) > 0) {
                    if (curr.isHead()) {
                        if (next) {
                            curr = next;
                        } else {
                            maxLayer--;
                        }
                    } else {
                        return null;
                    }
                    return null;
                } else if (this.compare(k, curr.k) < 0) {
                    if (next) {
                        if (this.compare(k, next.k) < 0) {
                            curr = next
                        } else if (this.compare(k, next.k) >= 0) {
                            maxLayer--;
                        }
                    } else {
                        maxLayer--;
                    }
                } else {
                    maxLayer--;
                }
            }
        }
        return null;
    }

    /**
     * 根据k值搜索所有符合值
     * @param start 
     */
    public searchs(k: K): Array<SkipListNode<K, V>> {
        let msg = new Array<SkipListNode<K, V>>();
        let node = this.search(k);
        while (node) {
            if (this.compare(k, node.k) == 0) {
                msg.push(node);
                node = node.next();
            } else {
                break;
            }
        }
        return msg;
    }

    /**
     * test show
     */
    public test_toShow(): Array<Array<V>> {
        let start = this._head;
        let maxLagyer = this._head.getMaxLayer() - 1;
        let msg = new Array<Array<V>>();
        while (start) {
            let lay = start.layers;
            for (let i=maxLagyer; i>=0; i--) {
                if (!msg[maxLagyer-i]) {
                    msg[maxLagyer-i] = new Array<V>();
                }
                msg[maxLagyer-i].push(lay[i] && lay[i].next && lay[i].next.v || null)
            }
            start = start.next();
        }
        return msg;
    }
}
