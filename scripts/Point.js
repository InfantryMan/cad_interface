class Point {
    constructor(x, y, uniq = true) {
        this.x = x;
        this.y = y;
        this.radius = 5;
        this.fixed = false;
        if (uniq) this._id = Point.counter;
    }

    get id() {
        return this._id;
    }

    static get counter() {
        Point._counter = (Point._counter || 0) + 1;
        console.log(Point._counter);
        return Point._counter;
    }

    get solverFormat() {
        return {
            x: this.x,
            y: this.y,
            id: this.id,
            fixed: this.fixed
        };
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.fill();
    }
}

export default Point;