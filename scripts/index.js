import Line from "./Line";
import Point from "./Point";
import Vector from "./Vector";
import Constraint from "./Constraint";
import ConstraintTypes from "./ConstraintTypes";
import SolverJson from "./SolverJson";

const canvas = document.getElementById("canvas");
const button_lines = document.getElementById("button_lines");
const button_points = document.getElementById("button_points");
const button_default = document.getElementById("button_default");
const button_horizontal_line = document.getElementById("button_horizontal_line");
const button_parallelism = document.getElementById("button_parallelism");
const button_perpendicularity = document.getElementById("button_perpendicularity");
const button_distance = document.getElementById("button_distance");
const button_angle = document.getElementById("button_angle");
const button_point_to_line = document.getElementById("button_point_to_line");
const button_moving = document.getElementById("button_moving");

const ctx = canvas.getContext('2d');

const ModesEnum = {
    default: 1,
    line: 2,
    drawingLine: 3,
    point: 4,

    limitations_horizontal_line: 5,
    limitations_vertical_line: 6,

    limitations_parallelism: 7,
    limitations_parallelism_second: 8,

    limitations_perpendicularity: 9,
    limitations_limitations_perpendicularity_second: 10,

    limitations_distance: 11,

    limitations_angle: 12,
    limitations_angle_second: 13,

    limitations_point_to_line: 14,
    limitations_point_to_line_second: 15,

    moving: 16,
    moving_down_point: 17
};
  
let epsDist = 10;
let epsDistMove = 9;

let Points = new Map();
let Lines = [];
let Constraints = [];

let mode = ModesEnum.default, prevMode;

let clickPoint, prevPoint;
let clickLine, prevLine;

let movingPoint;

let canvasHeight = window.innerHeight / 5 * 4;
let canvasWidth  = window.innerWidth / 5 * 4;

canvas.width  = canvasWidth;
canvas.height = canvasHeight;

let canvasTopLeft = new Point(canvas.getBoundingClientRect().x, canvas.getBoundingClientRect().y, false);

// При изменение размеров окна canvas уменьшается
// window.addEventListener("resize", () => {
//     canvas.width  = window.innerWidth / 5 * 4;
//     canvas.height = window.innerHeight / 5 * 4;
//     canvasTopLeft = new Point(canvas.getBoundingClientRect().x, canvas.getBoundingClientRect().y, false);

//     let deltaHeight = (canvas.height - canvasHeight);
//     let deltaWidth  = (canvas.width - canvasWidth);

//     canvasHeight = canvas.height;
//     canvasWidth  = canvas.width;

//     for (let point of Points) {
//         if (point[1].x + deltaWidth > 0)  point[1].x += deltaWidth;
//         if (point[1].y + deltaHeight > 0) point[1].y += deltaHeight;
//     }

//     draw();
// });

window.addEventListener("resize", () => {
    canvasTopLeft = new Point(canvas.getBoundingClientRect().x, canvas.getBoundingClientRect().y, false);
});

const clear = () => {
    ctx.save();
    ctx.fillStyle = "grey";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
}

const draw = () => {
    clear();
    for (let p of Points.values()) {
        p.draw(ctx);
    }
    Lines.forEach(element => {
        element.draw(ctx);
    });
}

const onDrawLine = () => {
    const line = new Line(prevPoint, clickPoint);
    Lines.push(line);
    line.draw(ctx);
}

const dot = (point1, point2) => { return point1.x * point2.x + point1.y * point2.y; }

const dist = (point1, point2) => { 
    const dx = point2.x - point1.x; 
    const dy = point2.y - point1.y; 
    return Math.sqrt(dx * dx + dy * dy);
}

const distToLine = (P, P0, P1) => {
    const numerator = (P1.y - P0.y) * P.x - (P1.x - P0.x) * P.y + P1.x * P0.y - P1.y * P0.x;
    return Math.abs(numerator) / dist(P0, P1); 
}


const checkPointId = (pointId, constraint) => {
    if (pointId === constraint.point1.id || 
        pointId === constraint.point2.id || 
        pointId === constraint.point3.id || 
        pointId === constraint.point4.id) {
            return true;
    }
    return false;
}

const getConstraintPointsIds = (constraint) => {
    const pointsIds = [];
    if (constraint.point1 && constraint.point1.id) { pointsIds.push(constraint.point1.id); }
    if (constraint.point2 && constraint.point2.id) { pointsIds.push(constraint.point2.id); }
    if (constraint.point3 && constraint.point3.id) { pointsIds.push(constraint.point3.id); }
    if (constraint.point4 && constraint.point4.id) { pointsIds.push(constraint.point4.id); }
    return pointsIds;
}

const noteRelatedRestrictions = (newConstraint) => {
    newConstraint.watched = true;
    const newConstraintPointIds = getConstraintPointsIds(newConstraint);
    for (let pointId of newConstraintPointIds) {
        for (let constraint of Constraints) {
            if (!constraint.watched && checkPointId(pointId, constraint)) {
                noteRelatedRestrictions(constraint);
            }
        }
    }
}

const getConnectedPointsAndConstraints = (newConstraint) => {
    noteRelatedRestrictions(newConstraint);
    const resultConstraints = [];
    const resultPointIdsSet = new Set();
    for (let constraint of Constraints) {
        if (constraint.watched) {
            resultConstraints.push(constraint);
            getConstraintPointsIds(constraint).forEach(pointId => resultPointIdsSet.add(pointId));
        }
        constraint.watched = false;
    }
    return {
        connectedPointIds: Array.from(resultPointIdsSet), 
        connectedConstraints: resultConstraints
    };
}

const getNearestPoint = (clickPoint) => {
    let S, minS = Number.MAX_SAFE_INTEGER, minPoint;

    Points.forEach(point => {
        S = dist(clickPoint, point);
        if (S < minS) {
            minS = S;
            minPoint = point;
        }
    });

    return {minPoint, minS};
}
    
const getNearestLine = (clickPoint) => {
    let S, minS = Number.MAX_SAFE_INTEGER, minLine;

    Lines.forEach(line => {
        const P  = clickPoint;
        const P0 = line.point1;
        const P1 = line.point2;

        const w0 = new Vector(P.x - P0.x, P.y - P0.y);
        const w1 = new Vector(P.x - P1.x, P.y - P1.y);
        const v  = new Vector(P1.x - P0.x, P1.y - P0.y);
        const minus_v = new Vector(-v.x, -v.y);

        if (dot(w0, v) <= 0) {
            S = dist(P, P0);
        } else if (dot(w1, minus_v) <= 0) {
            S = dist(P, P1);
        } else {
            S = distToLine(P, P0, P1);
        }

        if (S < minS) {
            minS = S;
            minLine = line;
        }
    });

    return {minLine, minS};
}

const getPointsAndConstraintsForSolver = (pointsIds, constraints) => {
    const pointsForSolver = [];
    pointsIds.forEach(pointId => {
        pointsForSolver.push(Points.get(pointId).solverFormat);
    });
    const constraintsForSolver = [];
    constraints.forEach(constraint => {
        constraintsForSolver.push(constraint.solverFormat);
    });
    return {pointsForSolver, constraintsForSolver};
}

const sameConstraintExists = (newConstraint) => {
    for (let constraint of Constraints) {
        if (constraint.type === newConstraint.type) {
            if (constraint.type === ConstraintTypes.Horizontal_line || constraint.type === ConstraintTypes.Vertical_line) {
                if (constraint.point1.id === newConstraint.point1.id && constraint.point2.id === newConstraint.point2.id) {
                    return true;
                }
            }
            if (constraint.type === ConstraintTypes.Parallelism_of_2_lines || constraint.type === ConstraintTypes.Perpendicularity_of_2_lines || constraint.type === ConstraintTypes.Angle_between_2_lines) {
                if (constraint.point1.id === newConstraint.point1.id && 
                    constraint.point2.id === newConstraint.point2.id &&
                    constraint.point3.id === newConstraint.point3.id && 
                    constraint.point4.id === newConstraint.point4.id 
                    ||
                    constraint.point1.id === newConstraint.point3.id && 
                    constraint.point2.id === newConstraint.point4.id &&
                    constraint.point3.id === newConstraint.point1.id && 
                    constraint.point4.id === newConstraint.point2.id ) {
                        return true;
                    }
            }
            if (constraint.type === ConstraintTypes.Distance_between_2_points) {
                if (constraint.point1.id === newConstraint.point1.id && constraint.point2.id === newConstraint.point2.id) {
                    return true;
                }
            }
            if (constraint.type === ConstraintTypes.Belonging_point_to_line) {
                if (constraint.point1.id === newConstraint.point1.id && 
                    constraint.point2.id === newConstraint.point2.id &&
                    constraint.point3.id === newConstraint.point3.id) {
                    return true;
                }
            }
        }
    }
    return false;
}

const showPoints = (newPoints) => {
    for (let i = 0; i < newPoints.size(); i++) {
        let Point = newPoints.get(i);

        console.log("ID: " + Point.get(0) + 
                    "; X = " + Point.get(1) + 
                    "; Y = " + Point.get(2));
        console.log("\n");
    }
}

const changeCoordinatesAfterSolution = (newPoints) => {
    for (let i = 0; i < newPoints.size(); i++) {
        let Point = newPoints.get(i);
        let id = Point.get(0);
        let newX = Point.get(1);
        let newY = Point.get(2);

        console.log("ID: " + Point.get(0) + 
                    "; X = " + Point.get(1) + 
                    "; Y = " + Point.get(2));
        console.log("\n");
        
        Points.get(id).x = newX;
        Points.get(id).y = newY;
    }
}    

const getFirstConstraintForPoint = (point) => {
    for (let constraint of Constraints) {
        if (checkPointId(point.id, constraint)) {
            return constraint;
        }
    }
    return null;
}

const canvasOnClick = (e) => {
    e.preventDefault();

    if (mode === ModesEnum.default) return;

    if (mode >= ModesEnum.line && mode <= ModesEnum.point) {
        clickPoint = new Point(e.clientX - canvasTopLeft.x, e.clientY - canvasTopLeft.y);
        switch(mode) {
            case ModesEnum.line: {
                clickPoint.draw(ctx);
                Points.set(clickPoint.id, clickPoint);
                prevPoint = clickPoint;
                prevMode = mode;
                mode = ModesEnum.drawingLine;
                break;
            }
      
            case ModesEnum.drawingLine: {
                clickPoint.draw(ctx);
                Points.set(clickPoint.id, clickPoint);
                onDrawLine();
                prevPoint = clickPoint;
                prevMode = mode;
                break;
            }
      
            case ModesEnum.point: {
                clickPoint.draw(ctx);
                Points.set(clickPoint.id, clickPoint);
                break;
            }
        }
    }

    clickPoint = new Point(e.clientX - canvasTopLeft.x, e.clientY - canvasTopLeft.y, false);

    switch(mode) {
        case ModesEnum.limitations_vertical_line:
        case ModesEnum.limitations_horizontal_line: {
            const {minLine: line, minS: distance} = getNearestLine(clickPoint);
            if (!line || distance > epsDist) return;

            let constraint;
            if (mode === ModesEnum.limitations_vertical_line) {
                constraint = new Constraint(ConstraintTypes.Vertical_line, line.point1, line.point2);
            } else {
                constraint = new Constraint(ConstraintTypes.Horizontal_line, line.point1, line.point2);
            }

            if (sameConstraintExists(constraint)) {
                console.log("such constraint already exists");
                return;
            }

            Constraints.push(constraint);

            const {connectedPointIds, connectedConstraints} = getConnectedPointsAndConstraints(constraint);
            const {pointsForSolver, constraintsForSolver} = getPointsAndConstraintsForSolver(connectedPointIds, connectedConstraints);

            const solverJson = new SolverJson(pointsForSolver, constraintsForSolver, [line.point1.id, line.point2.id]);

            console.log(solverJson);

            const newPoints = Module['Solver'](JSON.stringify(solverJson));

            changeCoordinatesAfterSolution(newPoints);

            draw();
            break;
        }

        case ModesEnum.limitations_perpendicularity:
        case ModesEnum.limitations_parallelism: {
            const {minLine: line, minS: distance} = getNearestLine(clickPoint);
            if (!line || distance > epsDist) return;

            prevLine = line;
            prevMode = mode;

            if (mode == ModesEnum.limitations_perpendicularity) 
                mode = ModesEnum.limitations_perpendicularity_second;
            else
                mode = ModesEnum.limitations_parallelism_second;

            break;
        }

        case ModesEnum.limitations_perpendicularity_second:
        case ModesEnum.limitations_parallelism_second: {
            const {minLine: line, minS: distance} = getNearestLine(clickPoint);
            if (!line || distance > epsDist) return;

            clickLine = line;

            const constraintType = (mode === ModesEnum.limitations_perpendicularity_second) ?
                ConstraintTypes.Perpendicularity_of_2_lines :
                ConstraintTypes.Parallelism_of_2_lines;

            const constraint = new Constraint(constraintType, prevLine.point1, prevLine.point2, clickLine.point1, clickLine.point2);

            if (sameConstraintExists(constraint)) {
                console.log("such constraint already exists");
                return;
            }

            Constraints.push(constraint);

            const {connectedPointIds, connectedConstraints} = getConnectedPointsAndConstraints(constraint);
            const {pointsForSolver, constraintsForSolver} = getPointsAndConstraintsForSolver(connectedPointIds, connectedConstraints);

            const solverJson = new SolverJson(pointsForSolver, constraintsForSolver, [line.point1.id, 0]);

            console.log(solverJson);

            const newPoints = Module['Solver'](JSON.stringify(solverJson));

            changeCoordinatesAfterSolution(newPoints);

            draw();

            prevMode = mode;
            if (mode == ModesEnum.limitations_perpendicularity_second) 
                mode = ModesEnum.limitations_perpendicularity;
            else 
                mode = ModesEnum.limitations_parallelism;

            break;

        }

        case ModesEnum.limitations_distance: {
            const {minLine: line, minS: distance} = getNearestLine(clickPoint);
            if (!line || distance > epsDist) return;

            clickLine = line;

            let lineLength = -1;
            while (lineLength <= 0 || isNaN(lineLength)) {
                const lengthString = prompt("Введите длину отрезка.", "");
                if (lengthString === null) {
                    return;
                }
                lineLength = Number(lengthString);
                if (isNaN(lineLength)) {
                    alert("Неверный ввод. Введите действительное число, которое больше 0.");
                } else if (lineLength <= 0) {
                    alert("Значение длины должно быть больше 0.");
                }
            }

            const constraint = new Constraint(ConstraintTypes.Distance_between_2_points, clickLine.point1, clickLine.point2, 0, 0, lineLength);

            if (sameConstraintExists(constraint)) {
                console.log("such constraint already exists");
                return;
            }

            Constraints.push(constraint);

            const {connectedPointIds, connectedConstraints} = getConnectedPointsAndConstraints(constraint);
            const {pointsForSolver, constraintsForSolver} = getPointsAndConstraintsForSolver(connectedPointIds, connectedConstraints);

            const solverJson = new SolverJson(pointsForSolver, constraintsForSolver, [line.point1.id, line.point2.id]);

            console.log(solverJson);

            const newPoints = Module['Solver'](JSON.stringify(solverJson));

            changeCoordinatesAfterSolution(newPoints);

            draw();

            break;
        }

        case ModesEnum.limitations_angle: {
            const {minLine: line, minS: distance} = getNearestLine(clickPoint);
            if (!line || distance > epsDist) return;

            clickLine = line;
            prevLine = clickLine;

            prevMode = mode;
            mode = ModesEnum.limitations_angle_second;
            break;
        }

        case ModesEnum.limitations_angle_second: {
            const {minLine: line, minS: distance} = getNearestLine(clickPoint);
            if (!line || distance > epsDist) return;

            clickLine = line;

            let angleValue;
            while (isNaN(angleValue)) {
                const angleValueString = prompt("Введите угол.", "");
                if (angleValueString === null) {
                    prevMode = mode;
                    mode = ModesEnum.limitations_angle;
                    return;
                }
                angleValue = Number(angleValueString);
                if (isNaN(angleValue)) {
                    alert("Неверный ввод. Введите действительное число, которое больше 0.");
                } 
            }

            const constraint = new Constraint(ConstraintTypes.Angle_between_2_lines, prevLine.point1, prevLine.point2, clickLine.point1, clickLine.point2, angleValue);

            if (sameConstraintExists(constraint)) {
                console.log("such constraint already exists");
                return;
            }

            Constraints.push(constraint);

            const {connectedPointIds, connectedConstraints} = getConnectedPointsAndConstraints(constraint);
            const {pointsForSolver, constraintsForSolver} = getPointsAndConstraintsForSolver(connectedPointIds, connectedConstraints);

            const solverJson = new SolverJson(pointsForSolver, constraintsForSolver, [line.point1.id, line.point2.id]);

            console.log(solverJson);

            const newPoints = Module['Solver'](JSON.stringify(solverJson));

            changeCoordinatesAfterSolution(newPoints);

            draw();

            prevMode = mode;
            mode = ModesEnum.limitations_angle;

            break;
        }

        case ModesEnum.limitations_point_to_line: {
            const {minPoint: point, minS: distance} = getNearestPoint(clickPoint);
            if (!point || distance > epsDist) return;

            prevPoint = clickPoint = point;
            prevMode = mode;
            mode = ModesEnum.limitations_point_to_line_second;
            break;
        }

        case ModesEnum.limitations_point_to_line_second: {
            const {minLine: line, minS: distance} = getNearestLine(clickPoint);
            if (!line || distance > epsDist) return;

            clickLine = line;

            const constraint = new Constraint(ConstraintTypes.Belonging_point_to_line, clickLine.point1, clickLine.point2, prevPoint);
            if (sameConstraintExists(constraint)) {
                console.log("such constraint already exists");
                return;
            }

            Constraints.push(constraint);

            const {connectedPointIds, connectedConstraints} = getConnectedPointsAndConstraints(constraint);
            const {pointsForSolver, constraintsForSolver} = getPointsAndConstraintsForSolver(connectedPointIds, connectedConstraints);

            console.log(prevPoint);
            const solverJson = new SolverJson(pointsForSolver, constraintsForSolver, [prevPoint.id]);

            console.log(solverJson);

            const newPoints = Module['Solver'](JSON.stringify(solverJson));

            changeCoordinatesAfterSolution(newPoints);

            draw();

            prevMode = mode;
            mode = ModesEnum.limitations_point_to_line;

            break;
        }
    }
}

const canvasOnMouseMove = (e) => {
    canvasTopLeft = new Point(canvas.getBoundingClientRect().x, canvas.getBoundingClientRect().y, false);
    clickPoint = new Point(e.clientX - canvasTopLeft.x, e.clientY - canvasTopLeft.y, false);

    if (mode === ModesEnum.drawingLine) {
        draw();
        const line = new Line(prevPoint, clickPoint);
        line.draw(ctx);
    }

    if (mode === ModesEnum.moving_down_point) {
        // movePoint(movingPoint, clickPoint.x, clickPoint.y)
        // draw();


  
        movePoint(movingPoint, clickPoint.x, clickPoint.y);

        const constraint = getFirstConstraintForPoint(movingPoint);
        console.log(constraint);
        if (constraint !== null) {
            const {connectedPointIds, connectedConstraints} = getConnectedPointsAndConstraints(constraint);
            const {pointsForSolver, constraintsForSolver} = getPointsAndConstraintsForSolver(connectedPointIds, connectedConstraints);
            const solverJson = new SolverJson(pointsForSolver, constraintsForSolver, [movingPoint.id, 0]);
            console.log(solverJson);
            const newPoints = Module['Solver'](JSON.stringify(solverJson));
            changeCoordinatesAfterSolution(newPoints);
        } 
        
        draw();
    }
}

const canvasOnRightClick = (e) => {
    e.preventDefault();

    if (mode === ModesEnum.drawingLine) {
        if (prevMode === ModesEnum.line) {
            Points.delete(prevPoint.id);
        }
        mode = ModesEnum.line;
        clear();
        draw();
    }
}

const canvasOnMouseDown = (e) => {
    e.preventDefault();
    console.log("kekkk");
    if (mode === ModesEnum.moving) {
        clickPoint = new Point(e.clientX - canvasTopLeft.x, e.clientY - canvasTopLeft.y, false);
        const {minPoint: point, minS: distance} = getNearestPoint(clickPoint);
        if (point && distance < epsDistMove) {
            prevMode = mode;
            mode = ModesEnum.moving_down_point;
            movingPoint = point;
            // movePoint(point, newX, newY);
        }
    }
}

const canvasOnMouseUp = (e) => {
    canvasTopLeft = new Point(canvas.getBoundingClientRect().x, canvas.getBoundingClientRect().y, false);
    clickPoint = new Point(e.clientX - canvasTopLeft.x, e.clientY - canvasTopLeft.y, false);
    console.log('heeeeyyy');
    console
    if (mode === ModesEnum.moving_down_point) {
        const constraint = getFirstConstraintForPoint(movingPoint);
        if (constraint !== null) {
            const {connectedPointIds, connectedConstraints} = getConnectedPointsAndConstraints(constraint);
            const {pointsForSolver, constraintsForSolver} = getPointsAndConstraintsForSolver(connectedPointIds, connectedConstraints);
            const solverJson = new SolverJson(pointsForSolver, constraintsForSolver, [movingPoint.id, 0]);
            console.log(solverJson);
            const newPoints = Module['Solver'](JSON.stringify(solverJson));
            changeCoordinatesAfterSolution(newPoints);
        }
        
        draw();
        prevMode = mode;
        mode = ModesEnum.moving;
    }
}

const movePoint = (point, newX, newY) => {
    point.x = newX;
    point.y = newY;
}

const button_lines_onClick = (e) => {
    prevMode = mode;
    mode = ModesEnum.line;
}

const button_points_onClick = (e) => {
    prevMode = mode;
    mode = ModesEnum.point;
}

const button_default_onClick = (e) => {
    prevMode = mode;
    mode = ModesEnum.default;

    // //const json = `{"Points":[{"x":403.5,"y":156.50245154530512,"id":2,"fixed":false},{"x":494.5,"y":156.50245154530512,"id":3,"fixed":false},{"x":886.5,"y":156.5024515453051,"id":4,"fixed":false},{"x":31.5,"y":436.5,"id":1,"fixed":false}],"Constraints":[{"point1":2,"point2":3,"point3":0,"point4":0,"Type":"Horizontal_line","value":0},{"point1":3,"point2":4,"point3":0,"point4":0,"Type":"Horizontal_line","value":0},{"point1":3,"point2":4,"point3":1,"point4":2,"Type":"Perpendicularity_of_2_lines","value":0}],"MovablePoints_id":[1,0]}`;
    // const json = `{"Points":[{"x":186.5,"y":148.69101063626525,"id":1,"fixed":false},{"x":644.1078155936365,"y":148.69101063626525,"id":2,"fixed":false},{"x":675.4993986095989,"y":333.50010215221425,"id":3,"fixed":false},{"x":158.44742109835744,"y":421.3259427986679,"id":4,"fixed":false},{"x":761.5,"y":669.5,"id":5,"fixed":false},{"x":987.5,"y":210.5,"id":6,"fixed":false}],"Constraints":[{"point1":1,"point2":2,"point3":0,"point4":0,"Type":"Horizontal_line","value":0},{"point1":2,"point2":3,"point3":3,"point4":4,"Type":"Perpendicularity_of_2_lines","value":0},{"point1":3,"point2":4,"point3":5,"point4":6,"Type":"Parallelism_of_2_lines","value":0}],"MovablePoints_id":[5,0]}`;
    // const newPoints = Module['Solver'](json);
    // // console.log(newPoints);
    // showPoints(newPoints);
    draw();
}

const button_horizontal_line_onClick = (e) => {
    prevMode = mode;
    mode = ModesEnum.limitations_horizontal_line;
}

const button_vertical_line_onClick = (e) => {
    prevMode = mode;
    mode = ModesEnum.limitations_vertical_line;
}

const button_parallelism_onClick = (e) => {
    prevMode = mode;
    mode = ModesEnum.limitations_parallelism;
}

const button_perpendicularity_onClick = (e) => {
    prevMode = mode;
    mode = ModesEnum.limitations_perpendicularity;
}

const button_distance_onClick = (e) => {
    prevMode = mode;
    mode = ModesEnum.limitations_distance;
}

const button_angle_onClick = (e) => {
    prevMode = mode;
    mode = ModesEnum.limitations_angle;
}

const button_point_to_line_onClick = (e) => {
    prevMode = mode;
    mode = ModesEnum.limitations_point_to_line;
}

const button_moving_onClick = (e) => {
    prevMode = mode;
    mode = ModesEnum.moving;
    console.log(mode);
}

canvas.addEventListener('click', canvasOnClick);
canvas.addEventListener('contextmenu', canvasOnRightClick)
canvas.addEventListener('mousemove', canvasOnMouseMove);
canvas.addEventListener('mousedown', canvasOnMouseDown);
canvas.addEventListener('mouseup', canvasOnMouseUp);

button_lines.addEventListener('click', button_lines_onClick);
button_points.addEventListener('click', button_points_onClick);
button_default.addEventListener('click', button_default_onClick);
button_horizontal_line.addEventListener('click', button_horizontal_line_onClick);
button_vertical_line.addEventListener('click', button_vertical_line_onClick);
button_parallelism.addEventListener('click', button_parallelism_onClick);
button_perpendicularity.addEventListener('click', button_perpendicularity_onClick);
button_distance.addEventListener('click', button_distance_onClick);
button_angle.addEventListener('click', button_angle_onClick);
button_point_to_line.addEventListener('click', button_point_to_line_onClick);
button_moving.addEventListener('click', button_moving_onClick);
