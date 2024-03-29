class Line {
    constructor(point1, point2) {
        this.point1 = point1;
        this.point2 = point2;
        this.deleted = false;
        this.color = "#000000";
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.moveTo(this.point1.x, this.point1.y);
        ctx.lineTo(this.point2.x, this.point2.y);
        ctx.strokeStyle = this.color;
        ctx.stroke();
    }
}

export default Line;