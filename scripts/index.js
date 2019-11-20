import Line from "./Line";
import Point from "./Point";
import Vector from "./Vector";
import Constraint from "./Constraint";
import ConstraintTypes from "./ConstraintTypes";
import SolverJson from "./SolverJson";

// Получаем javascript объекты HTML элементов по их id
const canvas = document.getElementById("canvas");
const button_lines = document.getElementById("button_lines");
const button_points = document.getElementById("button_points");
const button_horizontal_line = document.getElementById("button_horizontal_line");
const button_parallelism = document.getElementById("button_parallelism");
const button_perpendicularity = document.getElementById("button_perpendicularity");
const button_distance = document.getElementById("button_distance");
const button_angle = document.getElementById("button_angle");
const button_point_to_line = document.getElementById("button_point_to_line");
const button_fix_point = document.getElementById("button_fix_point");
const button_delete_point = document.getElementById("button_delete_point");
const button_delete_line = document.getElementById("button_delete_line");

const button_elements = [
    button_lines, 
    button_points, 
    button_horizontal_line,
    button_vertical_line, 
    button_parallelism, 
    button_perpendicularity,
    button_distance,
    button_angle,
    button_point_to_line,
    button_fix_point,
    button_delete_point,
    button_delete_line
];

const makeButtonActive = (button_element) => {
    button_element.style.backgroundColor = "rgb(115, 193, 115)";
}

const makeButtonDefault = (button_element) => {
    button_element.style.backgroundColor = "";
}

const makeButtonsDefault = () => {
    button_elements.forEach((button) => makeButtonDefault(button));
}

const current_mode_element = document.getElementById("current_mode");
current_mode_element.innerHTML = "Перемещение";

const getCurrentModeElementInnerHTML = (mode) => {
    switch(mode) {
        case ModesEnum.line:
        case ModesEnum.drawingLine: return "Отрезки";
        case ModesEnum.point: return "Точки";
        case ModesEnum.limitations_horizontal_line: return "Горизонтальность отрезка";
        case ModesEnum.limitations_vertical_line: return "Вертикальность отрезка";
        case ModesEnum.limitations_parallelism: return "Параллельность: 1 отрезок";
        case ModesEnum.limitations_parallelism_second: return "Параллельность: 2 отрезок";
        case ModesEnum.limitations_perpendicularity: return "Перпендикулярность: 1 отрезок";
        case ModesEnum.limitations_perpendicularity_second: return "Перпендикулярность: 2 отрезок";
        case ModesEnum.limitations_distance: return "Расстояние";
        case ModesEnum.limitations_angle: return "Угол: 1 отрезок";
        case ModesEnum.limitations_angle_second: return "Угол: 2 отрезок";
        case ModesEnum.limitations_point_to_line: return "Принадлежность точки отрезку: точка";
        case ModesEnum.limitations_point_to_line_second: return "Принадлежность точки отрезку: отрезок";
        case ModesEnum.moving:
        case ModesEnum.moving_down_line:
        case ModesEnum.moving_down_point: return "Перемещение";
        case ModesEnum.limitations_fix_point: return "Фиксация точки";
        case ModesEnum.delete_line: return "Удаление линии";
        case ModesEnum.delete_point: return "Удаление точки";
        default: return "Перемещение";
    }
}

// Получаем контекст для рисования
const ctx = canvas.getContext('2d');

// Состояния работы интерфейса
const ModesEnum = {
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
    moving_down_point: 17,
    moving_down_line: 18,

    limitations_fix_point: 19,

    delete_point: 20,
    delete_line: 21
};
  

let epsDist = 10;       // максимальное расстояние при выборе точки и отрезка
let epsDistMove = 9;    // аналогично, но только для перемещения точек и отрезков

let Points = new Map(); // ассоциативный контейнер, где ключ - это id точки, а значение - это объект класса Point
let Lines = [];         // массив из объектов класса Line
let Constraints = [];   // массив из объектов класса Constraint

let mode = ModesEnum.moving, prevMode; // mode - текущее состояние, prevMode - предыдущее состояние

let clickPoint, prevPoint;  // clickPoint - точка, на которую нажали, prevPoint - предыдущая точка
let clickLine, prevLine;    // аналогично

let movingPoint, movingLine;    // movingPoint - перемещаемая точка, movingLine - перемещаемая линия

// Координаты верхней левой точки канваса, необходимо для получения относительных координат на канвасе
let canvasTopLeft = new Point(canvas.getBoundingClientRect().x, canvas.getBoundingClientRect().y, false); 

canvas.height = canvas.parentElement.clientHeight;
canvas.width = canvas.parentElement.clientWidth;

/*  
    Данный код меняет размер канваса при изменении размеров окна. При желании его можно раскоментить, но тогда
    надо закомментить следующий обработчик 
*/
/*
window.addEventListener("resize", () => {
    canvas.width  = window.innerWidth / 5 * 4;
    canvas.height = window.innerHeight / 5 * 4;
    canvasTopLeft = new Point(canvas.getBoundingClientRect().x, canvas.getBoundingClientRect().y, false);

    let deltaHeight = (canvas.height - canvasHeight);
    let deltaWidth  = (canvas.width - canvasWidth);

    canvasHeight = canvas.height;
    canvasWidth  = canvas.width;

    for (let point of Points) {
        if (point[1].x + deltaWidth > 0)  point[1].x += deltaWidth;
        if (point[1].y + deltaHeight > 0) point[1].y += deltaHeight;
    }

    draw();
});
*/

/* Обработчик на изменение размеров окна браузера. В этом случае необходимо переопределить координаты верхнего левого угла канваса */
window.addEventListener("resize", () => {
    canvasTopLeft = new Point(canvas.getBoundingClientRect().x, canvas.getBoundingClientRect().y, false);
});

// Очищает канвас
const clear = () => {
    ctx.save();
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
}

// Отрисовывает на канвасе все точки и линии
const draw = () => {
    clear();
    for (let p of Points.values()) {
        if (!p.deleted) p.draw(ctx);
    }
    Lines.forEach(element => {
        if (!element.deleted) element.draw(ctx);
    });
}

// Рисует линию от prevPoint до clickPoint
const onDrawLine = () => {
    const line = new Line(prevPoint, clickPoint);
    Lines.push(line);
    line.draw(ctx);
}

// Скалярное произведение
const dot = (point1, point2) => { return point1.x * point2.x + point1.y * point2.y; }

// Расстояние между двумя точками
const dist = (point1, point2) => { 
    const dx = point2.x - point1.x; 
    const dy = point2.y - point1.y; 
    return Math.sqrt(dx * dx + dy * dy);
}

// Расстояние от точки P до вектоа P0P1
const distToLine = (P, P0, P1) => {
    const numerator = (P1.y - P0.y) * P.x - (P1.x - P0.x) * P.y + P1.x * P0.y - P1.y * P0.x;
    return Math.abs(numerator) / dist(P0, P1); 
}

// Проверяет, имеется ли точка с pointId в ограничении constraint
const checkPointId = (pointId, constraint) => {
    if (pointId === constraint.point1.id || 
        pointId === constraint.point2.id || 
        pointId === constraint.point3.id || 
        pointId === constraint.point4.id) {
            return true;
    }
    return false;
}

// Возвращает массив pointId точек ограничения constraint
const getConstraintPointsIds = (constraint) => {
    const pointsIds = [];
    if (constraint.point1 && constraint.point1.id) { pointsIds.push(constraint.point1.id); }
    if (constraint.point2 && constraint.point2.id) { pointsIds.push(constraint.point2.id); }
    if (constraint.point3 && constraint.point3.id) { pointsIds.push(constraint.point3.id); }
    if (constraint.point4 && constraint.point4.id) { pointsIds.push(constraint.point4.id); }
    return pointsIds;
}

// Отмечает просмотренные ограничения полем watched = true
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

// Возвращает вершины, связанные с ограничением newConstraint
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

// Возвращает ближайшую точку minPoint и расстояние до нее minS от точки clickPoint
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
    
// Возвращает ближайшую линию minLine и расстояние до нее minS от точки clickPoint
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

// Возвращает массивы точек и ограничений в формате, необходимом для Solver
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

// Проверяет, существует ли уже аналогичное ограничение в системе
const sameConstraintExists = (newConstraint) => {
    for (let constraint of Constraints) {
        if (constraint.type === ConstraintTypes.Horizontal_line && newConstraint.type === ConstraintTypes.Vertical_line ||
            constraint.type === ConstraintTypes.Vertical_line && newConstraint.type === ConstraintTypes.Horizontal_line) {
                if (constraint.point1.id === newConstraint.point1.id && constraint.point2.id === newConstraint.point2.id) {
                    return true;
                }
            }

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

// Выводит список точек в консоль
const showPoints = (newPoints) => {
    for (let i = 0; i < newPoints.size(); i++) {
        let Point = newPoints.get(i);

        console.log("ID: " + Point.get(0) + 
                    "; X = " + Point.get(1) + 
                    "; Y = " + Point.get(2));
        console.log("\n");
    }
}

// Изменяет координаты точек после получения решения от солвера
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

// Возвращает первое ограничение для точки
const getFirstConstraintForPoint = (point) => {
    for (let constraint of Constraints) {
        if (checkPointId(point.id, constraint)) {
            return constraint;
        }
    }
    return null;
}

// Возвращает первое ограничение для линии
const getFirstConstraintForLine = (line) => {
    for (let constraint of Constraints) {
        if (checkPointId(line.point1.id, constraint) || checkPointId(line.point2.id, constraint)) {
            return constraint;
        }
    }
    return null;
}

const formSolverJson = (constraint, movablePoints) => {
    const {connectedPointIds, connectedConstraints} = getConnectedPointsAndConstraints(constraint);
    const {pointsForSolver, constraintsForSolver} = getPointsAndConstraintsForSolver(connectedPointIds, connectedConstraints);
    const solverJson = new SolverJson(pointsForSolver, constraintsForSolver, movablePoints);
    console.log(solverJson);
    return solverJson;
}

const addConstraint = (constraint) => {
    if (sameConstraintExists(constraint)) {
        alert("such constraint already exists");
        return null;
    }
    Constraints.push(constraint);
}

// Функция-обработчик нажатия на канвас
const canvasOnClick = (e) => {
    e.preventDefault();

    if (mode === ModesEnum.moving) { return; }

    if (mode >= ModesEnum.line && mode <= ModesEnum.point) {
        clickPoint = new Point(e.clientX - canvasTopLeft.x, e.clientY - canvasTopLeft.y);
        switch(mode) {
            case ModesEnum.line: {
                clickPoint.draw(ctx);
                Points.set(clickPoint.id, clickPoint);
                prevPoint = clickPoint;
                prevMode = mode;
                mode = ModesEnum.drawingLine;
                current_mode_element.innerHTML = getCurrentModeElementInnerHTML(mode);
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

            clickLine = line;
            let constraint;
            if (mode === ModesEnum.limitations_vertical_line) {
                constraint = new Constraint(ConstraintTypes.Vertical_line, line.point1, line.point2);
            } else {
                constraint = new Constraint(ConstraintTypes.Horizontal_line, line.point1, line.point2);
            }

            if (addConstraint(constraint) === null) return;
            const solverJson = formSolverJson(constraint, [clickLine.point1.id, clickLine.point2.id]);
            if (solverJson === null) return;
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
            current_mode_element.innerHTML = getCurrentModeElementInnerHTML(mode);
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

            if (addConstraint(constraint) === null) return;
            const solverJson = formSolverJson(constraint, [clickLine.point1.id, clickLine.point2.id]);
            if (solverJson === null) return;
            const newPoints = Module['Solver'](JSON.stringify(solverJson));
            changeCoordinatesAfterSolution(newPoints);

            draw();

            prevMode = mode;
            if (mode == ModesEnum.limitations_perpendicularity_second) 
                mode = ModesEnum.limitations_perpendicularity;
            else 
                mode = ModesEnum.limitations_parallelism;
            current_mode_element.innerHTML = getCurrentModeElementInnerHTML(mode);    
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

            if (addConstraint(constraint) === null) return;
            const solverJson = formSolverJson(constraint, [clickLine.point1.id, clickLine.point2.id]);
            if (solverJson === null) return;
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
            current_mode_element.innerHTML = getCurrentModeElementInnerHTML(mode);
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
            const angleCos = Math.cos(angleValue / 57,2958);
            console.log("angle = ", angleValue);
            console.log("cos = ", angleCos);

            const constraint = new Constraint(ConstraintTypes.Angle_between_2_lines, prevLine.point1, prevLine.point2, clickLine.point1, clickLine.point2, angleCos);

            if (addConstraint(constraint) === null) return;
            const solverJson = formSolverJson(constraint, [clickLine.point1.id, clickLine.point2.id]);
            console.log(solverJson);
            if (solverJson === null) return;
            const newPoints = Module['Solver'](JSON.stringify(solverJson));
            changeCoordinatesAfterSolution(newPoints);

            draw();

            prevMode = mode;
            mode = ModesEnum.limitations_angle;
            current_mode_element.innerHTML = getCurrentModeElementInnerHTML(mode);
            break;
        }

        case ModesEnum.limitations_point_to_line: {
            const {minPoint: point, minS: distance} = getNearestPoint(clickPoint);
            if (!point || distance > epsDist) return;

            prevPoint = clickPoint = point;
            prevMode = mode;
            mode = ModesEnum.limitations_point_to_line_second;
            current_mode_element.innerHTML = getCurrentModeElementInnerHTML(mode);
            break;
        }

        case ModesEnum.limitations_point_to_line_second: {
            const {minLine: line, minS: distance} = getNearestLine(clickPoint);
            if (!line || distance > epsDist) return;

            clickLine = line;

            const constraint = new Constraint(ConstraintTypes.Belonging_point_to_line, clickLine.point1, clickLine.point2, prevPoint);
            
            if (addConstraint(constraint) === null) return;
            const solverJson = formSolverJson(constraint, [prevPoint.id, 0]);
            if (solverJson === null) return;
            const newPoints = Module['Solver'](JSON.stringify(solverJson));
            changeCoordinatesAfterSolution(newPoints);
            
            draw();

            prevMode = mode;
            mode = ModesEnum.limitations_point_to_line;
            current_mode_element.innerHTML = getCurrentModeElementInnerHTML(mode);
            break;
        }

        case ModesEnum.limitations_fix_point: {
            const {minPoint: point, minS: distance} = getNearestPoint(clickPoint);
            if (!point || distance > epsDist) return;

            console.log(point);
            point.fixed = true;
            break;
        }

        case ModesEnum.delete_point: {
            const {minPoint: point, minS: distance} = getNearestPoint(clickPoint);
            if (!point || distance > epsDist) return;

            Points.get(point.id).deleted = true;
            draw();
            break;
        }

        case ModesEnum.delete_line: {
            const {minLine: line, minS: distance} = getNearestLine(clickPoint);
            if (!line || distance > epsDist) return;

            for (let l of Lines) {
                if (l.point1 === line.point1 && l.point2 === line.point2) {
                    l.deleted = true;
                }
            }
            draw();
            break;
        }
    }
}

// Функция - обработчик перемещения курсора
const canvasOnMouseMove = (e) => {
    canvasTopLeft = new Point(canvas.getBoundingClientRect().x, canvas.getBoundingClientRect().y, false);
    const prevPointForMoving = clickPoint;
    clickPoint = new Point(e.clientX - canvasTopLeft.x, e.clientY - canvasTopLeft.y, false);

    if (mode === ModesEnum.drawingLine) {
        draw();
        const line = new Line(prevPoint, clickPoint);
        line.draw(ctx);
        return;
    }


    if (mode === ModesEnum.moving_down_point) {
        // movePoint(movingPoint, clickPoint.x, clickPoint.y)
        // draw();
        if (movingPoint.fixed) return;
        movePoint(movingPoint, clickPoint.x, clickPoint.y);
        const constraint = getFirstConstraintForPoint(movingPoint);
        if (constraint !== null) {
            const solverJson = formSolverJson(constraint, [movingPoint.id, 0]);
            console.log(solverJson);
            const newPoints = Module['Solver'](JSON.stringify(solverJson));
            changeCoordinatesAfterSolution(newPoints);
        } 
        draw();
        return;
    }

    if (mode === ModesEnum.moving_down_line) {
        if (movingLine.point1.fixed && movingLine.point2.fixed) return;
        if (movingLine.point1.fixed) { 
            movePointOnDelta(movingLine.point2, clickPoint.x - prevPointForMoving.x, clickPoint.y - prevPointForMoving.y); 
        } else if (movingLine.point2.fixed) {
            movePointOnDelta(movingLine.point1, clickPoint.x - prevPointForMoving.x, clickPoint.y - prevPointForMoving.y); 
        } else {
            moveLine(movingLine, clickPoint.x - prevPointForMoving.x, clickPoint.y - prevPointForMoving.y);
        }
        
        const constraint = getFirstConstraintForLine(movingLine);
        if (constraint !== null) {
            const solverJson = formSolverJson(constraint, [movingLine.point1.id, movingLine.point2.id]);
            console.log(solverJson);
            const newPoints = Module['Solver'](JSON.stringify(solverJson));
            changeCoordinatesAfterSolution(newPoints);
        } 
        draw();
        return;
    }
}

// Функция - обработчик нажатия правой кнопки мыши
const canvasOnRightClick = (e) => {
    e.preventDefault();

    if (mode === ModesEnum.drawingLine) {
        if (prevMode === ModesEnum.line) {
            Points.delete(prevPoint.id);
        }
        mode = ModesEnum.line;
        current_mode_element.innerHTML = getCurrentModeElementInnerHTML(mode);
        draw();
    } else {
        prevMode = mode;
        mode = ModesEnum.moving;
        current_mode_element.innerHTML = getCurrentModeElementInnerHTML(mode);
        makeButtonsDefault();
    }
}

// Функция - обработчик нажатия и удержания левой кнопки мыши
const canvasOnMouseDown = (e) => {
    e.preventDefault();
    if (mode === ModesEnum.moving) {
        clickPoint = new Point(e.clientX - canvasTopLeft.x, e.clientY - canvasTopLeft.y, false);
        const {minPoint: point, minS: distance} = getNearestPoint(clickPoint);
        if (point && distance < epsDistMove) {
            prevMode = mode;
            mode = ModesEnum.moving_down_point;
            movingPoint = point;
        } else {
            const {minLine: line, minS: dist} = getNearestLine(clickPoint);
            if (line && dist < epsDistMove) {
                prevMode = mode;
                mode = ModesEnum.moving_down_line;
                movingLine = line;
                prevPoint = clickPoint;
            }
        }
    }
}

// Функция - обработчик отпускания левой кнопки мыши
const canvasOnMouseUp = (e) => {
    if (mode === ModesEnum.moving_down_point || mode === ModesEnum.moving_down_line) {
        prevMode = mode;
        mode = ModesEnum.moving;
    }
}

// Задает новые координаты точки point
const movePoint = (point, newX, newY) => {
    point.x = newX;
    point.y = newY;
}

const movePointOnDelta = (point, deltaX, deltaY) => {
    point.x += deltaX;
    point.y += deltaY;
}

// Изменяет имеющиеся координаты концов линий
const moveLine = (line, deltaX, deltaY) => {
    line.point1.x += deltaX;
    line.point1.y += deltaY;
    line.point2.x += deltaX;
    line.point2.y += deltaY;
}

// Дальше идут функции - обработчки нажатий на кнопки над канвасом
const button_lines_onClick = (e) => {
    prevMode = mode;
    mode = ModesEnum.line;
    current_mode_element.innerHTML = getCurrentModeElementInnerHTML(mode);
    makeButtonsDefault();
    makeButtonActive(button_lines);
}

const button_points_onClick = (e) => {
    prevMode = mode;
    mode = ModesEnum.point;
    current_mode_element.innerHTML = getCurrentModeElementInnerHTML(mode);
    makeButtonsDefault();
    makeButtonActive(button_points);
}

const button_horizontal_line_onClick = (e) => {
    prevMode = mode;
    mode = ModesEnum.limitations_horizontal_line;
    current_mode_element.innerHTML = getCurrentModeElementInnerHTML(mode);
    makeButtonsDefault();
    makeButtonActive(button_horizontal_line);
}

const button_vertical_line_onClick = (e) => {
    prevMode = mode;
    mode = ModesEnum.limitations_vertical_line;
    current_mode_element.innerHTML = getCurrentModeElementInnerHTML(mode);
    makeButtonsDefault();
    makeButtonActive(button_vertical_line);
}

const button_parallelism_onClick = (e) => {
    prevMode = mode;
    mode = ModesEnum.limitations_parallelism;
    current_mode_element.innerHTML = getCurrentModeElementInnerHTML(mode);
    makeButtonsDefault();
    makeButtonActive(button_parallelism);
}

const button_perpendicularity_onClick = (e) => {
    prevMode = mode;
    mode = ModesEnum.limitations_perpendicularity;
    current_mode_element.innerHTML = getCurrentModeElementInnerHTML(mode);
    makeButtonsDefault();
    makeButtonActive(button_perpendicularity);
}

const button_distance_onClick = (e) => {
    prevMode = mode;
    mode = ModesEnum.limitations_distance;
    current_mode_element.innerHTML = getCurrentModeElementInnerHTML(mode);
    makeButtonsDefault();
    makeButtonActive(button_distance);
}

const button_angle_onClick = (e) => {
    prevMode = mode;
    mode = ModesEnum.limitations_angle;
    current_mode_element.innerHTML = getCurrentModeElementInnerHTML(mode);
    makeButtonsDefault();
    makeButtonActive(button_angle);
}

const button_point_to_line_onClick = (e) => {
    prevMode = mode;
    mode = ModesEnum.limitations_point_to_line;
    current_mode_element.innerHTML = getCurrentModeElementInnerHTML(mode);
    makeButtonsDefault();
    makeButtonActive(button_point_to_line);
}

const button_fix_point_onClick = (e) => {
    prevMode = mode;
    mode = ModesEnum.limitations_fix_point;
    current_mode_element.innerHTML = getCurrentModeElementInnerHTML(mode);
    makeButtonsDefault();
    makeButtonActive(button_fix_point);
}

const button_delete_point_onClick = (e) => {
    prevMode = mode;
    mode = ModesEnum.delete_point;
    current_mode_element.innerHTML = getCurrentModeElementInnerHTML(mode);
    makeButtonsDefault();
    makeButtonActive(button_delete_point);
}

const button_delete_line_onClick = (e) => {
    prevMode = mode;
    mode = ModesEnum.delete_line;
    current_mode_element.innerHTML = getCurrentModeElementInnerHTML(mode);
    makeButtonsDefault();
    makeButtonActive(button_delete_line);
}

// Навешивание функций-обработчиков на события
canvas.addEventListener('click', canvasOnClick);
canvas.addEventListener('contextmenu', canvasOnRightClick)
canvas.addEventListener('mousemove', canvasOnMouseMove);
canvas.addEventListener('mousedown', canvasOnMouseDown);
canvas.addEventListener('mouseup', canvasOnMouseUp);

button_lines.addEventListener('click', button_lines_onClick);
button_points.addEventListener('click', button_points_onClick);
button_horizontal_line.addEventListener('click', button_horizontal_line_onClick);
button_vertical_line.addEventListener('click', button_vertical_line_onClick);
button_parallelism.addEventListener('click', button_parallelism_onClick);
button_perpendicularity.addEventListener('click', button_perpendicularity_onClick);
button_distance.addEventListener('click', button_distance_onClick);
button_angle.addEventListener('click', button_angle_onClick);
button_point_to_line.addEventListener('click', button_point_to_line_onClick);
button_fix_point.addEventListener('click', button_fix_point_onClick);
button_delete_point.addEventListener('click', button_delete_point_onClick);
button_delete_line.addEventListener('click', button_delete_line_onClick);