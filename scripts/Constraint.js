class Constraint {
    constructor(type, point1, point2, point3 = 0, point4 = 0, value = 0) {
        this.type = type;
        this.point1 = point1;
        this.point2 = point2;
        this.point3 = point3;
        this.point4 = point4;
        this.value = value;
        this._id = Constraint.counter;
        this.watched = false;
    }

    get id() {
        return this._id;
    }

    static get counter() {
        Constraint._counter = (Constraint._counter || 0) + 1;
        return Constraint._counter;
    }

    get solverFormat() {
        let returnObj = {};

        if (this.point1.id) { 
            returnObj.point1 = this.point1.id; 
        } else {
            returnObj.point1 = 0;
        }

        if (this.point2.id) { 
            returnObj.point2 = this.point2.id; 
        } else {
            returnObj.point2 = 0;
        }

        if (this.point3.id) { 
            returnObj.point3 = this.point3.id; 
        } else {
            returnObj.point3 = 0;
        }

        if (this.point4.id) { 
            returnObj.point4 = this.point4.id; 
        } else {
            returnObj.point4 = 0;
        }

        returnObj.Type = this.type;
        returnObj.value = this.value;
        return returnObj;

    }
}

export default Constraint;
