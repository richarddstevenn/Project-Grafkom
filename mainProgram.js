class MyObject {
    canvas = null;
    vertex = [];
    faces = [];

    SHADER_PROGRAM = null;
    _color = null;
    _position = null;

    _MMatrix = LIBS.get_I4();
    _PMatrix = LIBS.get_I4();
    _VMatrix = LIBS.get_I4();
    _greyScality = 0;

    TRIANGLE_VERTEX = null;
    TRIANGLE_FACES = null;

    MODEL_MATRIX = LIBS.get_I4();

    child = [];

    constructor(vertex, faces, source_shader_vertex, source_shader_fragment) {
        this.vertex = vertex;
        this.faces = faces;

        var compile_shader = function (source, type, typeString) {
            var shader = GL.createShader(type);
            GL.shaderSource(shader, source);
            GL.compileShader(shader);
            if (!GL.getShaderParameter(shader, GL.COMPILE_STATUS)) {
                alert("ERROR IN " + typeString + " SHADER: " + GL.getShaderInfoLog(shader));
                return false;
            }
            return shader;
        };

        var shader_vertex = compile_shader(source_shader_vertex, GL.VERTEX_SHADER, "VERTEX");

        var shader_fragment = compile_shader(source_shader_fragment, GL.FRAGMENT_SHADER, "FRAGMENT");

        this.SHADER_PROGRAM = GL.createProgram();
        GL.attachShader(this.SHADER_PROGRAM, shader_vertex);
        GL.attachShader(this.SHADER_PROGRAM, shader_fragment);

        GL.linkProgram(this.SHADER_PROGRAM);

        //vao
        this._color = GL.getAttribLocation(this.SHADER_PROGRAM, "color");
        this._position = GL.getAttribLocation(this.SHADER_PROGRAM, "position");

        //uniform
        this._PMatrix = GL.getUniformLocation(this.SHADER_PROGRAM, "PMatrix"); //projection
        this._VMatrix = GL.getUniformLocation(this.SHADER_PROGRAM, "VMatrix"); //View
        this._MMatrix = GL.getUniformLocation(this.SHADER_PROGRAM, "MMatrix"); //Model
        this._greyScality = GL.getUniformLocation(this.SHADER_PROGRAM, "greyScality");//GreyScality

        GL.enableVertexAttribArray(this._color);
        GL.enableVertexAttribArray(this._position);
        GL.useProgram(this.SHADER_PROGRAM);

        this.TRIANGLE_VERTEX = GL.createBuffer();
        this.TRIANGLE_FACES = GL.createBuffer();
    }

    setup() {
        GL.bindBuffer(GL.ARRAY_BUFFER, this.TRIANGLE_VERTEX);
        GL.bufferData(GL.ARRAY_BUFFER,
            new Float32Array(this.vertex),
            GL.STATIC_DRAW);


        GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.TRIANGLE_FACES);
        GL.bufferData(GL.ELEMENT_ARRAY_BUFFER,
            new Uint16Array(this.faces),
            GL.STATIC_DRAW);

        this.child.forEach(obj => {
            obj.render(VIEW_MATRIX, PROJECTION_MATRIX);
        });
    }

    render(VIEW_MATRIX, PROJECTION_MATRIX) {
        GL.useProgram(this.SHADER_PROGRAM);
        GL.bindBuffer(GL.ARRAY_BUFFER, this.TRIANGLE_VERTEX);
        GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, this.TRIANGLE_FACES);
        GL.vertexAttribPointer(this._position, 3, GL.FLOAT, false, 4 * (3 + 3), 0);
        GL.vertexAttribPointer(this._color, 3, GL.FLOAT, false, 4 * (3 + 3), 3 * 4);

        GL.uniformMatrix4fv(this._PMatrix, false, PROJECTION_MATRIX);
        GL.uniformMatrix4fv(this._VMatrix, false, VIEW_MATRIX);
        GL.uniformMatrix4fv(this._MMatrix, false, this.MODEL_MATRIX);
        GL.uniform1f(this._greyScality, 1);

        GL.drawElements(GL.TRIANGLES, this.faces.length, GL.UNSIGNED_SHORT, 0);

        this.child.forEach(obj => {
            obj.render(VIEW_MATRIX, PROJECTION_MATRIX);
        });

        GL.flush();
    }
    model(MODEL_MATRIXX) {
        for (let i = 0; i < this.child.length; i++) {
            this.child[i].MODEL_MATRIX = MODEL_MATRIXX;
        }
    }
}


function generateBSpline(controlPoint, m, degree) {
    var curves = [];
    var knotVector = [];

    var n = controlPoint.length / 6;

    for (var i = 0; i < n + degree + 1; i++) {
        if (i < degree + 1) {
            knotVector.push(0);
        } else if (i >= n) {
            knotVector.push(n - degree);
        } else {
            knotVector.push(i - degree);
        }
    }

    var basisFunc = function (i, j, t) {
        if (j == 0) {
            if (knotVector[i] <= t && t < (knotVector[(i + 1)])) {
                return 1;
            } else {
                return 0;
            }
        }

        var den1 = knotVector[i + j] - knotVector[i];
        var den2 = knotVector[i + j + 1] - knotVector[i + 1];

        var term1 = 0;
        var term2 = 0;

        if (den1 != 0 && !isNaN(den1)) {
            term1 = ((t - knotVector[i]) / den1) * basisFunc(i, j - 1, t);
        }

        if (den2 != 0 && !isNaN(den2)) {
            term2 = ((knotVector[i + j + 1] - t) / den2) * basisFunc(i + 1, j - 1, t);
        }

        return term1 + term2;
    }

    for (var t = 0; t < m; t++) {
        var x = 0;
        var y = 0;
        var z = 0;
        var r = 0;
        var g = 0;
        var b = 0;

        var u = (t / m * (knotVector[controlPoint.length / 6] - knotVector[degree])) + knotVector[degree];

        for (var key = 0; key < n; key++) {

            var C = basisFunc(key, degree, u);
            x += (controlPoint[key * 6] * C);
            y += (controlPoint[key * 6 + 1] * C);
            z += (controlPoint[key * 6 + 2] * C);
            r += (controlPoint[key * 6 + 3] * C);
            g += (controlPoint[key * 6 + 4] * C);
            b += (controlPoint[key * 6 + 5] * C);
        }
        curves.push(x);
        curves.push(y);
        curves.push(z);
        curves.push(r);
        curves.push(g);
        curves.push(b);

    }
    return curves;
}

function buatKurva3D(pointList, radius) {
    const totalPoints = 100;
    const vertices = [];
    const indices = [];
    const splinePoints = generateBSpline(pointList, totalPoints, (pointList.length / 6) - 1);

    for (let i = 0; i < totalPoints * 2; i++) {
        for (let j = 0; j < 360; j++) {
            const angleInRadians = (j * Math.PI) / 180;
            const newX = splinePoints[i * 6] + Math.cos(angleInRadians) * radius;
            const newY = splinePoints[i * 6 + 1] + Math.sin(angleInRadians) * radius; 
            const newZ = splinePoints[i * 6 + 2]; 
            const r = splinePoints[i * 6 + 3];
            const g = splinePoints[i * 6 + 4];
            const b = splinePoints[i * 6 + 5];
            vertices.push(newX, newY, newZ, r, g, b);
        }
    }

    for (let i = 0; i < totalPoints * 2; i++) {
        for (let j = 0; j < 360; j++) {
            indices.push(j + (i * 360), j + 360 + (i * 360), j + 361 + (i * 360));
            indices.push(j + (i * 360), j + 1 + (i * 360), j + 361 + (i * 360));
        }
    }

    return { vertices, indices };
}

function buatConeVertices(tipX, tipY, tipZ, baseX, baseY, baseZ, radius, r, g, b) {
    const vertices = [];

    vertices.push(tipX, tipY, tipZ, r, g, b);

    for (let i = 0; i < 360; i++) {
        const angleInRadians = (i * Math.PI) / 180;
        const baseVertexX = baseX + Math.cos(angleInRadians) * radius;
        const baseVertexY = baseY + Math.sin(angleInRadians) * radius;
        vertices.push(baseVertexX, baseVertexY, baseZ, r, g, b);
    }

    vertices.push(baseX, baseY, baseZ, r, g, b);

    return vertices;
}

function buatConeIndices() {
    const indices = [];
    for (let i = 0; i < 360; i++) {
        indices.push(0, i + 1, i + 2);
    }
    for (let i = 1; i <= 360; i++) {
        indices.push(i, i + 1, 361);
    }
    return indices;
}

function buatSphere(centerX, centerY, centerZ, radiusX, radiusY, radiusZ, latBands, longBands, red, green, blue) {
    const vertices = [];
    const faces = [];

    const addVertex = (latNumber, longNumber) => {
        const theta = latNumber * Math.PI / latBands;
        const phi = longNumber * 2 * Math.PI / longBands;

        const x = centerX + radiusX * Math.cos(phi) * Math.sin(theta);
        const y = centerY + radiusY * Math.sin(phi) * Math.sin(theta);
        const z = centerZ + radiusZ * Math.cos(theta);

        vertices.push(x, y, z, red, green, blue);
    };

    const addFace = (latNumber, longNumber) => {
        const first = (latNumber * (longBands + 1)) + longNumber;
        const second = first + longBands + 1;

        faces.push(first, second, first + 1);
        faces.push(second, second + 1, first + 1);
    };

    for (let latNumber = 0; latNumber <= latBands; latNumber++) {
        for (let longNumber = 0; longNumber <= longBands; longNumber++) {
            addVertex(latNumber, longNumber);
        }
    }

    for (let latNumber = 0; latNumber < latBands; latNumber++) {
        for (let longNumber = 0; longNumber < longBands; longNumber++) {
            addFace(latNumber, longNumber);
        }
    }

    return { vertices, faces };
}


function buatBalokVertices(startX, startY, startZ, p, l, t, r, g, b) {
    const vertices = [];

    vertices.push(startX, startY, startZ, r, g, b);
    vertices.push(startX + p, startY, startZ, r, g, b);
    vertices.push(startX + p, startY + t, startZ, r, g, b);
    vertices.push(startX, startY + t, startZ, r, g, b);

    vertices.push(startX, startY, startZ - l, r, g, b);
    vertices.push(startX + p, startY, startZ - l, r, g, b);
    vertices.push(startX + p, startY + t, startZ - l, r, g, b);
    vertices.push(startX, startY + t, startZ - l, r, g, b);

    vertices.push(startX, startY, startZ, r, g, b);
    vertices.push(startX, startY, startZ - l, r, g, b);
    vertices.push(startX + p, startY, startZ, r, g, b);
    vertices.push(startX + p, startY, startZ - l, r, g, b);
    vertices.push(startX + p, startY + t, startZ, r, g, b);
    vertices.push(startX + p, startY + t, startZ - l, r, g, b);
    vertices.push(startX, startY + t, startZ, r, g, b);
    vertices.push(startX, startY + t, startZ - l, r, g, b);

    return vertices;
}


function buatBalokIndices() {
    const indices = [];

    indices.push(0, 1, 2);
    indices.push(2, 0, 3);

    indices.push(4, 5, 6);
    indices.push(6, 4, 7);

    for (let i = 0; i < 4; i++) {
        indices.push(i, (i + 1) % 4, i + 4);
        indices.push((i + 1) % 4, (i + 1) % 4 + 4, i + 4);
    }

    return indices;
}


function buatTabungVertices(x, y, z, startRadius, endRadius, height, r, g, b) {
    const vertices = [];

    for (let i = 0; i <= 360; i++) {
        const angleInRadians = (i * Math.PI) / 180;
        const xBase = x + Math.cos(angleInRadians) * startRadius;
        const zBase = z + Math.sin(angleInRadians) * startRadius;
        vertices.push(xBase, y, zBase, r, g, b);
    }

    for (let i = 0; i <= 360; i++) {
        const angleInRadians = (i * Math.PI) / 180;
        const xTop = x + Math.cos(angleInRadians) * endRadius;
        const zTop = z + Math.sin(angleInRadians) * endRadius;
        vertices.push(xTop, y + height, zTop, r, g, b);
    }

    for (let i = 0; i <= 360; i++) {
        const angleInRadians = (i * Math.PI) / 180;
        const xBase = x + Math.cos(angleInRadians) * startRadius;
        const zBase = z + Math.sin(angleInRadians) * startRadius;
        const xTop = x + Math.cos(angleInRadians) * endRadius;
        const zTop = z + Math.sin(angleInRadians) * endRadius;
        vertices.push(xBase, y, zBase, r, g, b);
        vertices.push(xTop, y + height, zTop, r, g, b);
    }

    return vertices;
}

function CylinderHoriz(x, y, z, radius_sumbu_y, radius_sumbu_z, height, r, g, b) {
    var vertices = [];
    vertices.push(x);
    vertices.push(y);
    vertices.push(z);
    vertices.push(r);
    vertices.push(g);
    vertices.push(b);
    for (let i = 0; i <= 360; i++) {
        var angleInRadians = (i * Math.PI) / 180;
        var x_baru = x;
        var y_baru = y + Math.cos(angleInRadians) * radius_sumbu_y;
        var z_baru = z + Math.sin(angleInRadians) * radius_sumbu_z;
        vertices.push(x_baru);
        vertices.push(y_baru);
        vertices.push(z_baru);
        vertices.push(r);
        vertices.push(g);
        vertices.push(b);
    }
    vertices.push(x + height);
    vertices.push(y);
    vertices.push(z);
    vertices.push(r);
    vertices.push(g);
    vertices.push(b);
    for (let i = 0; i <= 360; i++) {
        var angleInRadians = (i * Math.PI) / 180;
        var x_baru = x + height;
        var y_baru = y + Math.cos(angleInRadians) * radius_sumbu_y;
        var z_baru = z + Math.sin(angleInRadians) * radius_sumbu_z;
        vertices.push(x_baru);
        vertices.push(y_baru);
        vertices.push(z_baru);
        vertices.push(r);
        vertices.push(g);
        vertices.push(b);
    }
    return vertices;
}

function buatTabungIndices() {
    const indices = [];

    for (let i = 0; i <= 360; i++) {
        indices.push(0, i + 1, i + 2);
    }

    for (let i = 362; i < 722; i++) {
        indices.push(362, i + 1, i + 2);
    }

    for (let i = 1; i <= 361; i++) {
        indices.push(i, 360 + i, 361 + i);
        indices.push(361 + i, i, i + 1);
    }

    return indices;
}

function curve3Dimensi(titik_kontrol, radius) {
    const totalPoints = 100;
    const vertices = [];
    const indices = [];
    const titik = generateBSpline(titik_kontrol, totalPoints, 2);

    for (let i = 0; i < totalPoints * 2; i++) {
        for (let j = 0; j < 360; j++) {
            const angleInRadians = (j * Math.PI) / 180;
            const x_baru = titik[i * 6];
            const y_baru = titik[i * 6 + 1] + Math.cos(angleInRadians) * radius;
            const z_baru = titik[i * 6 + 2] + Math.sin(angleInRadians) * radius;
            const r = titik[i * 6 + 3];
            const g = titik[i * 6 + 4];
            const b = titik[i * 6 + 5];
            vertices.push(x_baru, y_baru, z_baru, r, g, b);
        }
    }

    for (let i = 0; i < totalPoints * 2; i++) {
        for (let j = 0; j < 360; j++) {
            indices.push(j + (i * 360), j + 360 + (i * 360), j + 361 + (i * 360));
            indices.push(j + (i * 360), j + 1 + (i * 360), j + 361 + (i * 360));
        }
    }

    return { vertices, indices };
}

function main() {
    var CANVAS = document.getElementById("canvas");

    CANVAS.width = window.innerWidth;
    CANVAS.height = window.innerHeight;
    try {
        GL = CANVAS.getContext("webgl", { antialias: true, alpha: true });
    } catch (e) {
        alert("WebGL context cannot be initialized");
        return false;
    }

    var shader_vertex_source = `
      attribute vec3 position;
      attribute vec3 color;


      uniform mat4 PMatrix;
      uniform mat4 VMatrix;
      uniform mat4 MMatrix;
     
      varying vec3 vColor;
      void main(void) {
      gl_Position = PMatrix*VMatrix*MMatrix*vec4(position, 1.);
      vColor = color;

      gl_PointSize=20.0;
      }`;

    var shader_fragment_source = `
      precision mediump float;
      varying vec3 vColor;
      // uniform vec3 color;


      uniform float greyScality;

      void main(void) {
      float greyScaleValue = (vColor.r + vColor.g + vColor.b)/3.;
      vec3 greyScaleColor = vec3(greyScaleValue, greyScaleValue, greyScaleValue);
      vec3 color = mix(greyScaleColor, vColor, greyScality);
      gl_FragColor = vec4(color, 1.);
      }`;

    var PROJECTION_MATRIX = LIBS.get_projection(40, CANVAS.width / CANVAS.height, 1, 100);
    var VIEW_MATRIX = LIBS.get_I4();

    LIBS.translateZ(VIEW_MATRIX, -90);
    LIBS.translateY(VIEW_MATRIX, 20);
    LIBS.translateX(VIEW_MATRIX, -27);

    // Yoshi
    var { vertices: KepalaDinoVertice, faces: KepalaDinoFaces } = buatSphere(2, -8, 18, 5 * 0.5, 5 * 0.5, 5 * 0.5, 150, 150, 0.267, 0.722, 0.2);
    var KepalaDino = new MyObject(KepalaDinoVertice, KepalaDinoFaces, shader_vertex_source, shader_fragment_source);
    KepalaDino.setup();

    var { vertices: MoncongDinoVertice, faces: MoncongDinoFaces } = buatSphere(2.5, -7, 20, 6 * 0.5, 6 * 0.5, 6 * 0.5, 150, 150, 0.267, 0.722, 0.2);
    var MoncongDino = new MyObject(MoncongDinoVertice, MoncongDinoFaces, shader_vertex_source, shader_fragment_source);
    MoncongDino.setup();
    KepalaDino.child.push(MoncongDino);

    var { vertices: MataRightDinoVertice, faces: MataRightDinoFaces } = buatSphere(1.5, -4.5, 18, 2.5 * 0.5, 3.5 * 0.5, 2.5 * 0.5, 150, 150, 0.267, 0.722, 0.2);
    var MataRightDino = new MyObject(MataRightDinoVertice, MataRightDinoFaces, shader_vertex_source, shader_fragment_source);
    MataRightDino.setup();
    KepalaDino.child.push(MataRightDino);

    var { vertices: MataLeftDinoVertice, faces: MataLeftDinoFaces } = buatSphere(3.5, -4.5, 18, 2.5 * 0.5, 3.5 * 0.5, 2.5 * 0.5, 150, 150, 0.267, 0.722, 0.2);
    var MataLeftDino = new MyObject(MataLeftDinoVertice, MataLeftDinoFaces, shader_vertex_source, shader_fragment_source);
    MataLeftDino.setup();
    KepalaDino.child.push(MataLeftDino);

    var { vertices: MataRightDalamDinoVertice, faces: MataRightDalamDinoFaces } = buatSphere(1.5, -4.5, 18.5, 2 * 0.5, 3 * 0.5, 2 * 0.5, 150, 150, 1, 1, 1);
    var MataRightDalamDino = new MyObject(MataRightDalamDinoVertice, MataRightDalamDinoFaces, shader_vertex_source, shader_fragment_source);
    MataRightDalamDino.setup();
    KepalaDino.child.push(MataRightDalamDino);

    var { vertices: MataLeftDalamDinoVertice, faces: MataLeftDalamDinoFaces } = buatSphere(3.5, -4.5, 18.5, 2 * 0.5, 3 * 0.5, 2 * 0.5, 150, 150, 1, 1, 1);
    var MataLeftDalamDino = new MyObject(MataLeftDalamDinoVertice, MataLeftDalamDinoFaces, shader_vertex_source, shader_fragment_source);
    MataLeftDalamDino.setup();
    KepalaDino.child.push(MataLeftDalamDino);

    var { vertices: MataRightPupilDinoVertice, faces: MataRightPupilDinoFaces } = buatSphere(1.5, -4, 19, 0.5, 0.55, 0.55, 150, 150, 0, 0, 0);
    var MataRightPupilDino = new MyObject(MataRightPupilDinoVertice, MataRightPupilDinoFaces, shader_vertex_source, shader_fragment_source);
    MataRightPupilDino.setup();
    KepalaDino.child.push(MataRightPupilDino);

    var { vertices: MataLeftPupilDinoVertice, faces: MataLeftPupilDinoFaces } = buatSphere(3.5, -4, 19, 0.5, 0.55, 0.55, 150, 150, 0, 0, 0);
    var MataLeftPupilDino = new MyObject(MataLeftPupilDinoVertice, MataLeftPupilDinoFaces, shader_vertex_source, shader_fragment_source);
    MataLeftPupilDino.setup();
    KepalaDino.child.push(MataLeftPupilDino);

    var { vertices: BadanDinoVertice, faces: BadanDinoFaces } = buatSphere(2.7, -14.5, 20, 8.5 * 0.5, 12.5 * 0.5, 7 * 0.5, 150, 150, 0.196, 0.561, 0.145);
    var BadanDino = new MyObject(BadanDinoVertice, BadanDinoFaces, shader_vertex_source, shader_fragment_source);
    BadanDino.setup();
    KepalaDino.child.push(BadanDino);

    var { vertices: BadanDepanDinoVertice, faces: BadanDepanDinoFaces } = buatSphere(2.7, -14.5, 21, 7.5 * 0.5, 11.5 * 0.5, 6.5 * 0.5, 150, 150, 0.8, 0.8, 0.8);
    var BadanDepanDino = new MyObject(BadanDepanDinoVertice, BadanDepanDinoFaces, shader_vertex_source, shader_fragment_source);
    BadanDepanDino.setup();
    KepalaDino.child.push(BadanDepanDino);

    var KakiKiriDinoVertice = buatBalokVertices(-0.5, -23, 22, 1.8, 2, 5, 0.267, 0.722, 0.2);
    var KakiKiriDinoFaces = buatBalokIndices();
    var KakiKiriDino = new MyObject(KakiKiriDinoVertice, KakiKiriDinoFaces, shader_vertex_source, shader_fragment_source);
    KakiKiriDino.setup();
    KepalaDino.child.push(KakiKiriDino);

    var KakiKananDinoVertice = buatBalokVertices(4, -23, 22, 1.8, 2, 5, 0.267, 0.722, 0.2);
    var KakiKananDinoFaces = buatBalokIndices();
    var KakiKananDino = new MyObject(KakiKananDinoVertice, KakiKananDinoFaces, shader_vertex_source, shader_fragment_source);
    KakiKananDino.setup();
    KepalaDino.child.push(KakiKananDino);

    var TelapakKakiKiriDinoVertice = buatBalokVertices(-0.8, -23, 23, 2.3, 3.5, 1.5, 0.851, 0.365, 0.149);
    var TelapakKakiKiriDinoFaces = buatBalokIndices();
    var TelapakKakiKiriDino = new MyObject(TelapakKakiKiriDinoVertice, TelapakKakiKiriDinoFaces, shader_vertex_source, shader_fragment_source);
    TelapakKakiKiriDino.setup();
    KepalaDino.child.push(TelapakKakiKiriDino);

    var TelapakKakiKananDinoVertice = buatBalokVertices(3.75, -23, 23, 2.3, 3.5, 1.5, 0.851, 0.365, 0.149);
    var TelapakKakiKananDinoFaces = buatBalokIndices();
    var TelapakKakiKananDino = new MyObject(TelapakKakiKananDinoVertice, TelapakKakiKananDinoFaces, shader_vertex_source, shader_fragment_source);
    TelapakKakiKananDino.setup();
    KepalaDino.child.push(TelapakKakiKananDino);

    var BawahTelapakKakiKiriDinoVertice = buatBalokVertices(-0.8, -23.3, 23, 2.3, 3.5, 0.3, 1, 0.945, 0.125);
    var BawahTelapakKakiKiriDinoFaces = buatBalokIndices();
    var BawahTelapakKakiKiriDino = new MyObject(BawahTelapakKakiKiriDinoVertice, BawahTelapakKakiKiriDinoFaces, shader_vertex_source, shader_fragment_source);
    BawahTelapakKakiKiriDino.setup();
    KepalaDino.child.push(BawahTelapakKakiKiriDino);

    var BawahTelapakKakiKananDinoVertice = buatBalokVertices(3.75, -23.3, 23, 2.3, 3.5, 0.3, 1, 0.945, 0.125);
    var BawahTelapakKakiKananDinoFaces = buatBalokIndices();
    var BawahTelapakKakiKananDino = new MyObject(BawahTelapakKakiKananDinoVertice, BawahTelapakKakiKananDinoFaces, shader_vertex_source, shader_fragment_source);
    BawahTelapakKakiKananDino.setup();
    KepalaDino.child.push(BawahTelapakKakiKananDino);

    var pointSenyum = [
        //depan  kanan  atas
        4.5, -6, 22, 0, 0, 0,
        2.5, -8, 24.1, 0, 0, 0,
        0.5, -6, 22, 0, 0, 0,
    ];

    var { vertices: SenyumDinoVertice, indices: SenyumDinoFaces } = buatKurva3D(pointSenyum, 0.3);
    var SenyumDino = new MyObject(SenyumDinoVertice, SenyumDinoFaces, shader_vertex_source, shader_fragment_source);
    SenyumDino.setup();
    KepalaDino.child.push(SenyumDino);

    var Duri1DinoVertice = buatConeVertices(2.5, -5, 14, 2.5, -7, 18, 0.8, 0.851, 0.365, 0.149);
    var Duri1DinoFaces = buatConeIndices();
    var Duri1Dino = new MyObject(Duri1DinoVertice, Duri1DinoFaces, shader_vertex_source, shader_fragment_source);
    Duri1Dino.setup();
    KepalaDino.child.push(Duri1Dino);

    var Duri2DinoVertice = buatConeVertices(2.5, -8, 13, 2.5, -8, 18, 0.8, 0.851, 0.365, 0.149);
    var Duri2DinoFaces = buatConeIndices();
    var Duri2Dino = new MyObject(Duri2DinoVertice, Duri2DinoFaces, shader_vertex_source, shader_fragment_source);
    Duri2Dino.setup();
    KepalaDino.child.push(Duri2Dino);

    var Duri3DinoVertice = buatConeVertices(2.5, -10.5, 14, 2.5, -8.5, 18, 0.8, 0.851, 0.365, 0.149);
    var Duri3DinoFaces = buatConeIndices();
    var Duri3Dino = new MyObject(Duri3DinoVertice, Duri3DinoFaces, shader_vertex_source, shader_fragment_source);
    Duri3Dino.setup();
    KepalaDino.child.push(Duri3Dino);

    var BuntutDinoVertice = buatConeVertices(2.5, -13.5, 10, 2.5, -16, 18, 2, 0.267, 0.722, 0.2);
    var BuntutDinoFaces = buatConeIndices();
    var BuntutDino = new MyObject(BuntutDinoVertice, BuntutDinoFaces, shader_vertex_source, shader_fragment_source);
    BuntutDino.setup();
    KepalaDino.child.push(BuntutDino);

    var pointTanganKiri = [
        //depan  kanan  atas
        6, -12, 20, 0.267, 0.722, 0.2,
        7.3, -10, 20, 0.267, 0.722, 0.2,
        8, -15, 23, 0.267, 0.722, 0.2,
    ];
    var { vertices: TanganKiriDinoVertice, indices: TanganKiriDinoFaces } = buatKurva3D(pointTanganKiri, 0.8);
    var TanganKiriDino = new MyObject(TanganKiriDinoVertice, TanganKiriDinoFaces, shader_vertex_source, shader_fragment_source);
    TanganKiriDino.setup();
    KepalaDino.child.push(TanganKiriDino);

    var pointTanganKanan = [
        //depan  kanan  atas
        -6 + 5.3, -12, 20, 0.267, 0.722, 0.2,
        -7.3 + 5.3, -10, 20, 0.267, 0.722, 0.2,
        -8 + 5.3, -15, 23, 0.267, 0.722, 0.2,
    ];
    var { vertices: TanganKananDinoVertice, indices: TanganKananDinoFaces } = buatKurva3D(pointTanganKanan, 0.8);
    var TanganKananDino = new MyObject(TanganKananDinoVertice, TanganKananDinoFaces, shader_vertex_source, shader_fragment_source);
    TanganKananDino.setup();
    KepalaDino.child.push(TanganKananDino);

    // Shy Guy
    var shyGuy = new MyObject(buatSphere(0, 0, 0, 4, 4.5, 4, 100, 100, 1, 1, 1).vertices, buatSphere(0, 0, 0, 2, 2, 2, 100, 100, 0, 0, 0).faces, shader_vertex_source, shader_fragment_source);
    shyGuy.setup();
    var hoodie = new MyObject(buatSphere(0, 0, -2, 5, 6, 5, 100, 100, 1, 0, 0).vertices, buatSphere(0, 0, 0, 2, 2, 2, 100, 100, 0, 0, 0).faces, shader_vertex_source, shader_fragment_source);
    hoodie.setup();
    var mata_kiri_shyguy = new MyObject(buatSphere(-1.25, 0.9, 2, 1.5, 2.1, 2, 100, 100, 0, 0, 0).vertices, buatSphere(0, 0, 0, 2, 2, 2, 100, 100, 0, 0, 0).faces, shader_vertex_source, shader_fragment_source);
    mata_kiri_shyguy.setup();
    var mata_kanan_shyguy = new MyObject(buatSphere(1.25, 0.9, 2, 1.5, 2.1, 2, 100, 100, 0, 0, 0).vertices, buatSphere(0, 0, 0, 2, 2, 2, 100, 100, 0, 0, 0).faces, shader_vertex_source, shader_fragment_source);
    mata_kanan_shyguy.setup();
    var mulut = new MyObject(buatSphere(0, -2, 3.2, 0.5, 0.5, 0.5, 100, 100, 0, 0, 0).vertices, buatSphere(0, 0, 0, 2, 2, 2, 100, 100, 0, 0, 0).faces, shader_vertex_source, shader_fragment_source);
    mulut.setup();
    var badanShyGuy = new MyObject(buatTabungVertices(0, -4, -2, 3, 5, -8, 1, 0, 0), buatTabungIndices(), shader_vertex_source, shader_fragment_source);
    badanShyGuy.setup();
    var tangan_kiri_shyguy = new MyObject(buatSphere(-4, -6, 0, 3, 1.5, 3, 100, 100, 1, 0, 0).vertices, buatSphere(0, 0, 0, 2, 2, 2, 100, 100, 0, 0, 0).faces, shader_vertex_source, shader_fragment_source);
    tangan_kiri_shyguy.setup();
    var tangan_kanan_shyguy = new MyObject(buatSphere(4, -6, 0, 3, 1.5, 3, 100, 100, 1, 0, 0).vertices, buatSphere(0, 0, 0, 2, 2, 2, 100, 100, 0, 0, 0).faces, shader_vertex_source, shader_fragment_source);
    tangan_kanan_shyguy.setup();

    var sepatu_kiri_shyguy = new MyObject(buatBalokVertices(-3.8, -13.5, 2, 3, 7, 1.5, 0.36470588235294116, 0.0196078431372549, 0.8588235294117647), buatBalokIndices(), shader_vertex_source, shader_fragment_source);
    sepatu_kiri_shyguy.setup();
    var sepatu_kanan_shyguy = new MyObject(buatBalokVertices(1, -13.5, 2, 3, 7, 1.5, 0.36470588235294116, 0.0196078431372549, 0.8588235294117647), buatBalokIndices(), shader_vertex_source, shader_fragment_source);
    sepatu_kanan_shyguy.setup();

    var sabuk = new MyObject(buatTabungVertices(0, -9, -2, 4.3, 4, 0.9, 0, 0, 0), buatTabungIndices(0, -6, -2, 3.5, 4, 5, -2, 0, 0, 0), shader_vertex_source, shader_fragment_source);
    sabuk.setup();
    var elemen_sabuk = new MyObject(buatBalokVertices(-0.9, -9.15, 2.5, 2, 0.5, 1, 0.9568627450980393, 0.6431372549019608, 0.01568627450980392), buatBalokIndices(), shader_vertex_source, shader_fragment_source);
    elemen_sabuk.setup();
    var kacamata = new MyObject(buatTabungVertices(0, -1, -2, 5.1, 5.1, 2, 0.7058823529411765, 0.4392156862745098, 0.3607843137254902), buatTabungIndices(), shader_vertex_source, shader_fragment_source);
    kacamata.setup();

    koordinat_kalung = [
        -3, -3.9, 0.3, 0, 0, 0,
        0, -7, 3, 0, 0, 0,
        3, -3.9, 0.3, 0, 0, 0
    ];

    var tali_kalung = new MyObject(buatKurva3D(koordinat_kalung, 0.2).vertices, buatKurva3D(koordinat_kalung, 2).indices, shader_vertex_source, shader_fragment_source);
    tali_kalung.setup();

    var cinderamata = new MyObject(buatSphere(0, -5.8, 2, 0.8, 0.8, 0.8, 100, 100, 0.36470588235294116, 0.0196078431372549, 0.8588235294117647).vertices, buatSphere(0, -5, 4, 1, 1, 1, 100, 100, 1, 1, 1).faces, shader_vertex_source, shader_fragment_source);
    cinderamata.setup();

    shyGuy.child.push(hoodie);
    shyGuy.child.push(mata_kiri_shyguy);
    shyGuy.child.push(mata_kanan_shyguy);
    shyGuy.child.push(mulut);
    shyGuy.child.push(badanShyGuy);
    shyGuy.child.push(tangan_kiri_shyguy);
    shyGuy.child.push(tangan_kanan_shyguy);
    shyGuy.child.push(sepatu_kiri_shyguy);
    shyGuy.child.push(sepatu_kanan_shyguy);
    shyGuy.child.push(sabuk);
    shyGuy.child.push(elemen_sabuk);
    shyGuy.child.push(kacamata);
    shyGuy.child.push(tali_kalung);
    shyGuy.child.push(cinderamata);

    // Toad
    var jamur = new MyObject(buatSphere(0, -0.5, 0, 3.5, 4, 3.5, 100, 100, 0.9568627450980393, 0.8627450980392157, 0.6745098039215687).vertices, buatSphere(0, 0, 0, 2, 2, 2, 100, 100, 0, 0, 0).faces, shader_vertex_source, shader_fragment_source);
    jamur.setup();

    var topi = new MyObject(buatSphere(0, 3.5, 0, 6, 4.5, 6, 100, 100, 0.9568627450980393, 0.9490196078431372, 0.9490196078431372).vertices, buatSphere(0, 0, 0, 2, 2, 2, 100, 100, 0, 0, 0).faces, shader_vertex_source, shader_fragment_source);
    topi.setup();

    var mata_kiri = new MyObject(buatSphere(-1, -0.85, 3.15, 0.5, 0.7, 0.3, 100, 100, 0, 0, 0).vertices, buatSphere(0, 0, 0, 2, 2, 2, 100, 100, 0, 0, 0).faces, shader_vertex_source, shader_fragment_source);
    mata_kiri.setup();

    var mata_kanan = new MyObject(buatSphere(1, -0.85, 3.15, 0.5, 0.7, 0.3, 100, 100, 0, 0, 0).vertices, buatSphere(0, 0, 0, 2, 2, 2, 100, 100, 0, 0, 0).faces, shader_vertex_source, shader_fragment_source);
    mata_kanan.setup();

    var putih_mata_kiri = new MyObject(buatSphere(-1.1, -0.6, 3.3, 0.2, 0.2, 0.2, 100, 100, 1, 1, 1).vertices, buatSphere(0, 0, 0, 2, 2, 2, 100, 100, 0, 0, 0).faces, shader_vertex_source, shader_fragment_source);
    putih_mata_kiri.setup();

    var putih_mata_kanan = new MyObject(buatSphere(1.1, -0.6, 3.3, 0.2, 0.2, 0.2, 100, 100, 1, 1, 1).vertices, buatSphere(0, 0, 0, 2, 2, 2, 100, 100, 0, 0, 0).faces, shader_vertex_source, shader_fragment_source);
    putih_mata_kanan.setup();

    //Depan
    var topi_merah_1 = new MyObject(buatSphere(0, 3.8, 2, 3, 3, 5, 100, 100, 1, 0, 0).vertices, buatSphere(0, 0, 0, 2, 2, 2, 100, 100, 0, 0, 0).faces, shader_vertex_source, shader_fragment_source);
    topi_merah_1.setup();
    //Kiri
    var topi_merah_2 = new MyObject(buatSphere(0, 3.8, -2, 3, 3, 5, 100, 100, 1, 0, 0).vertices, buatSphere(0, 0, 0, 2, 2, 2, 100, 100, 0, 0, 0).faces, shader_vertex_source, shader_fragment_source);
    topi_merah_2.setup();
    //Belakang
    var topi_merah_3 = new MyObject(buatSphere(-1.8, 3.8, 0, 5, 3, 3, 100, 100, 1, 0, 0).vertices, buatSphere(0, 0, 0, 2, 2, 2, 100, 100, 0, 0, 0).faces, shader_vertex_source, shader_fragment_source);
    topi_merah_3.setup();
    //Kanan
    var topi_merah_4 = new MyObject(buatSphere(1.8, 3.8, 0, 5, 3, 3, 100, 100, 1, 0, 0).vertices, buatSphere(0, 0, 0, 2, 2, 2, 100, 100, 0, 0, 0).faces, shader_vertex_source, shader_fragment_source);
    topi_merah_4.setup();

    var bibir = new MyObject(curve3Dimensi([-1.5, -2.3, 3, 0, 0, 0, 0, -4, 2.2, 0, 0, 0, 1.5, -2.3, 3, 0, 0, 0], 0.1).vertices, buatKurva3D([-1.5, -2.3, 3, 0, 0, 0, 0, -4, 2.2, 0, 0, 0, 1.5, -2.3, 3, 0, 0, 0], 2).indices, shader_vertex_source, shader_fragment_source);
    bibir.setup();

    var badan = new MyObject(buatTabungVertices(0, -4, 0, 1.8, 3.4, -3, 0.9568627450980393, 0.8627450980392157, 0.6745098039215687), buatTabungIndices(), shader_vertex_source, shader_fragment_source);
    badan.setup();

    var celana = new MyObject(buatSphere(0, -7.55, 0, 3.51, 2.5, 3.5, 100, 100, 1, 1, 1).vertices, buatSphere(0, -7, 2, 3, 3, 3, 100, 100, 1, 1, 1).faces, shader_vertex_source, shader_fragment_source);
    celana.setup();

    var tangan_kiri = new MyObject(CylinderHoriz(-1, -5, 0, 0.65, 0.65, -5, 0.9568627450980393, 0.8627450980392157, 0.6745098039215687), buatTabungIndices(), shader_vertex_source, shader_fragment_source);
    tangan_kiri.setup();
    var tangan_kanan = new MyObject(CylinderHoriz(1, -5, 0, 0.65, 0.65, 5, 0.9568627450980393, 0.8627450980392157, 0.6745098039215687), buatTabungIndices(), shader_vertex_source, shader_fragment_source);
    tangan_kanan.setup();

    var telapak_tangan_kanan = new MyObject(buatSphere(-5.8, -5, 0, 2, 0.65, 0.5, 100, 100, 1, 1, 1).vertices, buatSphere(-10, 2, 5, 3, 1, 1, 100, 100, 1, 1, 1).faces, shader_vertex_source, shader_fragment_source);
    telapak_tangan_kanan.setup();

    var telapak_tangan_kiri = new MyObject(buatSphere(5.8, -5, 0, 2, 0.65, 0.5, 100, 100, 1, 1, 1).vertices, buatSphere(-10, 2, 5, 3, 1, 1, 100, 100, 1, 1, 1).faces, shader_vertex_source, shader_fragment_source);
    telapak_tangan_kiri.setup();

    var jari_telapak_tangan_kiri = new MyObject(buatSphere(-6.5, -4.5, 0, 0.4, 1, 0.5, 100, 100, 1, 1, 1).vertices, buatSphere(-10, 2, 5, 3, 1, 1, 100, 100, 1, 1, 1).faces, shader_vertex_source, shader_fragment_source);
    jari_telapak_tangan_kiri.setup();

    var jari_telapak_tangan_kanan = new MyObject(buatSphere(6.5, -4.5, 0, 0.4, 1, 0.5, 100, 100, 1, 1, 1).vertices, buatSphere(-10, 2, 5, 3, 1, 1, 100, 100, 1, 1, 1).faces, shader_vertex_source, shader_fragment_source);
    jari_telapak_tangan_kanan.setup();

    var sabuk_ungu = new MyObject(buatTabungVertices(0, -5.7, 0, 2.8, 3, -0.3, 0, 0, 0.803921568627451), buatTabungIndices(), shader_vertex_source, shader_fragment_source);
    sabuk_ungu.setup();

    var sabuk_kuning = new MyObject(buatTabungVertices(0, -6, 0, 3, 3.2, -0.3, 1, 0.7176470588235294, 0), buatTabungIndices(), shader_vertex_source, shader_fragment_source);
    sabuk_kuning.setup();

    var sepatu_kiri = new MyObject(buatBalokVertices(-3.2, -10.8, -1, 3, -3.5, 1, 0.3607843137254902, 0.17254901960784313, 0.023529411764705882), buatBalokIndices(), shader_vertex_source, shader_fragment_source);
    sepatu_kiri.setup();
    var sepatu_kanan = new MyObject(buatBalokVertices(3.2, -10.8, -1, -3, -3.5, 1, 0.3607843137254902, 0.17254901960784313, 0.023529411764705882), buatBalokIndices(), shader_vertex_source, shader_fragment_source);
    sepatu_kanan.setup();

    jamur.child.push(topi);
    jamur.child.push(mata_kiri);
    jamur.child.push(mata_kanan);
    jamur.child.push(putih_mata_kiri);
    jamur.child.push(putih_mata_kanan);
    jamur.child.push(topi_merah_1);
    jamur.child.push(topi_merah_2);
    jamur.child.push(topi_merah_3);
    jamur.child.push(topi_merah_4);
    jamur.child.push(bibir);
    jamur.child.push(badan);
    jamur.child.push(celana);
    jamur.child.push(tangan_kiri);
    jamur.child.push(tangan_kanan);
    jamur.child.push(telapak_tangan_kanan);
    jamur.child.push(telapak_tangan_kiri);
    jamur.child.push(jari_telapak_tangan_kiri);
    jamur.child.push(jari_telapak_tangan_kanan);
    jamur.child.push(sabuk_ungu);
    jamur.child.push(sabuk_kuning);
    jamur.child.push(sepatu_kiri);
    jamur.child.push(sepatu_kanan);

    // Environment
    // pipe mario 1
    var pipe1 = new MyObject(buatTabungVertices(10, -10, -13, 5, 5, -15, 0.13, 0.545, 0.13), buatTabungIndices(), shader_vertex_source, shader_fragment_source);
    pipe1.setup();

    var topPipe1 = new MyObject(buatTabungVertices(10, -10, -13, 7, 7, 3, 0.13, 0.545, 0.13), buatTabungIndices(), shader_vertex_source, shader_fragment_source);
    topPipe1.setup();
    pipe1.child.push(topPipe1);

    // koin
    var koin = new MyObject(buatSphere(10, -1, -10, 3 ,3 ,3 , 100, 100, 1, 0.843, 0).vertices, buatSphere(0, 0, 0, 2, 2, 2, 100, 100, 0, 0, 0).faces, shader_vertex_source, shader_fragment_source);
    koin.setup();
    var koinDalam = new MyObject(buatSphere(10.5, -1.5, -7, 2.2 ,2.2 ,2.2 , 100, 100, 1, 0.9, 0).vertices, buatSphere(0, 0, 0, 2, 2, 2, 100, 100, 0, 0, 0).faces, shader_vertex_source, shader_fragment_source);
    koinDalam.setup();
    var koinBalokVertice = buatBalokVertices(10.9, -3.7, -2, 0.7, 1, 3, 1, 0.8, 0);
    var koinBalokFaces = buatBalokIndices();
    var koinBalok = new MyObject(koinBalokVertice, koinBalokFaces, shader_vertex_source, shader_fragment_source);
    koinBalok.setup();
    koin.child.push(koinBalok);
    koin.child.push(koinDalam);

     // pipe mario 2
     var pipe2 = new MyObject(buatTabungVertices(30, -10, -13, 5, 5, -15, 0.13, 0.545, 0.13), buatTabungIndices(), shader_vertex_source, shader_fragment_source);
     pipe2.setup();
 
     var topPipe2 = new MyObject(buatTabungVertices(30, -10, -13, 7, 7, 3, 0.13, 0.545, 0.13), buatTabungIndices(), shader_vertex_source, shader_fragment_source);
     topPipe2.setup();
 
     pipe2.child.push(topPipe2);

     // koin 2
    var koin2 = new MyObject(buatSphere(30, -1, -10, 3 ,3 ,3 , 100, 100, 1, 0.843, 0).vertices, buatSphere(0, 0, 0, 2, 2, 2, 100, 100, 0, 0, 0).faces, shader_vertex_source, shader_fragment_source);
    koin2.setup();
    var koinDalam2 = new MyObject(buatSphere(30, -1.5, -7, 2.2 ,2.2 ,2.2 , 100, 100, 1, 0.9, 0).vertices, buatSphere(0, 0, 0, 2, 2, 2, 100, 100, 0, 0, 0).faces, shader_vertex_source, shader_fragment_source);
    koinDalam2.setup();
    var koinBalokVertice2 = buatBalokVertices(29.6, -3.7, -2, 0.8, 2, 2.9, 1, 0.8, 0);
    var koinBalokFaces2 = buatBalokIndices();
    var koinBalok2 = new MyObject(koinBalokVertice2, koinBalokFaces2, shader_vertex_source, shader_fragment_source);
    koinBalok2.setup();
    koin2.child.push(koinBalok2);
    koin2.child.push(koinDalam2);

     // pipe mario 3
     var pipe3 = new MyObject(buatTabungVertices(50, -10, -13, 5, 5, -15, 0.13, 0.545, 0.13), buatTabungIndices(), shader_vertex_source, shader_fragment_source);
     pipe3.setup();
 
     var topPipe3 = new MyObject(buatTabungVertices(50, -10, -13, 7, 7, 3, 0.13, 0.545, 0.13), buatTabungIndices(), shader_vertex_source, shader_fragment_source);
     topPipe3.setup();
 
     pipe3.child.push(topPipe3);

     // koin 3
    var koin3 = new MyObject(buatSphere(50, -1, -10, 3 ,3 ,3 , 100, 100, 1, 0.843, 0).vertices, buatSphere(0, 0, 0, 2, 2, 2, 100, 100, 0, 0, 0).faces, shader_vertex_source, shader_fragment_source);
    koin3.setup();
    var koinDalam3 = new MyObject(buatSphere(49.5, -1.5, -7, 2.2 ,2.2 ,2.2 , 100, 100, 1, 0.9, 0).vertices, buatSphere(0, 0, 0, 2, 2, 2, 100, 100, 0, 0, 0).faces, shader_vertex_source, shader_fragment_source);
    koinDalam3.setup();
    var koinBalokVertice3 = buatBalokVertices(48.2, -3.7, -2, 0.7, 1, 3, 1, 0.8, 0);
    var koinBalokFaces3 = buatBalokIndices();
    var koinBalok3 = new MyObject(koinBalokVertice3, koinBalokFaces3, shader_vertex_source, shader_fragment_source);
    koinBalok3.setup();
    koin3.child.push(koinBalok3);
    koin3.child.push(koinDalam3);

    // Pohon
    var batangPohon = new MyObject(buatTabungVertices(75, -1, -10, 2.5, 4, -30, 0.537255, 0.298039, 0.184314), buatTabungIndices(), shader_vertex_source, shader_fragment_source);
    batangPohon.setup();

    var daun = new MyObject(buatSphere(75, 0, -10, 10, 10, 10, 100, 100, 0.1, 0.79, 0.1).vertices, buatSphere(0, 0, 0, 2, 2, 2, 100, 100, 0, 0, 0).faces, shader_vertex_source, shader_fragment_source);
    daun.setup();

    var daun2 = new MyObject(buatSphere(68, 0, -10, 10, 10, 10, 100, 100, 0.1, 0.79, 0.1).vertices, buatSphere(0, 0, 0, 2, 2, 2, 100, 100, 0, 0, 0).faces, shader_vertex_source, shader_fragment_source);
    daun2.setup();

    var daun3 = new MyObject(buatSphere(82, 0, -10, 10, 10, 10, 100, 100, 0.1, 0.79, 0.1).vertices, buatSphere(0, 0, 0, 2, 2, 2, 100, 100, 0, 0, 0).faces, shader_vertex_source, shader_fragment_source);
    daun3.setup();

    var daun4 = new MyObject(buatSphere(75, 5, -10, 10, 10, 10, 100, 100, 0.1, 0.79, 0.1).vertices, buatSphere(0, 0, 0, 2, 2, 2, 100, 100, 0, 0, 0).faces, shader_vertex_source, shader_fragment_source);
    daun4.setup();

    batangPohon.child.push(daun);
    batangPohon.child.push(daun2);
    batangPohon.child.push(daun3);
    batangPohon.child.push(daun4);

    // pohon 2
    var batangPohon2 = new MyObject(buatTabungVertices(-20, -1, -10, 2.5, 4, -30, 0.537255, 0.298039, 0.184314), buatTabungIndices(), shader_vertex_source, shader_fragment_source);
    batangPohon2.setup();

    var daun20 = new MyObject(buatSphere(-20, 0, -10, 10, 10, 10, 100, 100, 0.1, 0.79, 0.1).vertices, buatSphere(0, 0, 0, 2, 2, 2, 100, 100, 0, 0, 0).faces, shader_vertex_source, shader_fragment_source);
    daun20.setup();

    var daun21 = new MyObject(buatSphere(-27, 0, -10, 10, 10, 10, 100, 100, 0.1, 0.79, 0.1).vertices, buatSphere(0, 0, 0, 2, 2, 2, 100, 100, 0, 0, 0).faces, shader_vertex_source, shader_fragment_source);
    daun21.setup();

    var daun22 = new MyObject(buatSphere(-13, 0, -10, 10, 10, 10, 100, 100, 0.1, 0.79, 0.1).vertices, buatSphere(0, 0, 0, 2, 2, 2, 100, 100, 0, 0, 0).faces, shader_vertex_source, shader_fragment_source);
    daun22.setup();
    
    var daun23 = new MyObject(buatSphere(-20, 5, -10, 10, 10, 10, 100, 100, 0.1, 0.79, 0.1).vertices, buatSphere(0, 0, 0, 2, 2, 2, 100, 100, 0, 0, 0).faces, shader_vertex_source, shader_fragment_source);
    daun23.setup();

    batangPohon2.child.push(daun20);
    batangPohon2.child.push(daun21);
    batangPohon2.child.push(daun22);
    batangPohon2.child.push(daun23);

    GL.clearColor(0, 0, 0, 0);

    GL.enable(GL.DEPTH_TEST);
    GL.depthFunc(GL.LEQUAL);

    var shyGuyRotate = 0;
    var shyGuyScale = 1;
    var shyGuyScaleSpeed = 0;
    var shyGuyMovement = 0;
    var shyGuyMovementSpeed = 0;
    var shyGuyRotationSpeed = 0;
    var stopShyGuyMovement = false;

    var dinoRotate = 0;
    var dinoScale = 1;
    var dinoScaleSpeed = 0;
    var dinoMovement = 0;
    var dinoMovementSpeed = 0;
    var dinoRotationSpeed = 0;
    var stopdinoMovement = false;

    var jamurRotate = 0;
    var jamurScale = 1;
    var jamurScaleSpeed = 0;
    var jamurMovement = 0;
    var jamurMovementSpeed = 0;
    var jamurRotationSpeed = 0;
    var stopjamurMovement = false;

    var koinRotate = 0;
    var koinScale = 1;
    var koinScaleSpeed = 0;
    var koinMovement = 0;
    var koinMovementSpeed = 0;
    var koinRotationSpeed = 0;
    var stopkoinMovement = false;

    var koin2Rotate = 0;
    var koin2Scale = 1;
    var koin2ScaleSpeed = 0;
    var koin2Movement = 0;
    var koin2MovementSpeed = 0;
    var koin2RotationSpeed = 0;
    var stopkoin2Movement = false;

    var koin3Rotate = 0;
    var koin3Scale = 1;
    var koin3ScaleSpeed = 0;
    var koin3Movement = 0;
    var koin3MovementSpeed = 0;
    var koin3RotationSpeed = 0;
    var stopkoin3Movement = false;

    var time_prev = 0;

    let lastRotationChangeTime = 0;

    var animate = function (time) {
        var ratioAnimation = 0.005;

        shyGuyMovement += shyGuyMovementSpeed;
        dinoMovement += dinoMovementSpeed;
        jamurMovement += jamurMovementSpeed;

        shyGuyRotate += shyGuyRotationSpeed;
        jamurRotate += jamurRotationSpeed;
        dinoRotate += dinoRotationSpeed;

        shyGuyScale += shyGuyScaleSpeed;
        dinoScale += dinoScaleSpeed;
        jamurScale += jamurScaleSpeed;

        koinScale += koinScaleSpeed;
        koinScale += koinScaleSpeed;
        koinScale += koinScaleSpeed;

        koin2Scale += koin2ScaleSpeed;
        koin2Scale += koin2ScaleSpeed;
        koin2Scale += koin2ScaleSpeed;

        koin3Scale += koin2ScaleSpeed;
        koin3Scale += koin2ScaleSpeed;
        koin3Scale += koin2ScaleSpeed;
        
        GL.viewport(0, 0, CANVAS.width, CANVAS.height);
        GL.clear(GL.COLOR_BUFFER_BIT | GL.D_BUFFER_BIT);

        time_prev = time;

        MODEL_KOIN1 = LIBS.get_I4();
        koin.MODEL_MATRIX = MODEL_KOIN1;
        koinDalam.MODEL_MATRIX = MODEL_KOIN1;
        koinBalok.MODEL_MATRIX = MODEL_KOIN1;

        LIBS.translateY(MODEL_KOIN1, 0);
        LIBS.translateX(MODEL_KOIN1, 0);
        LIBS.translateX(MODEL_KOIN1, koinMovement);

        LIBS.scale(MODEL_KOIN1, koinScale, koinScale, koinScale);
        LIBS.translateY(MODEL_KOIN1, koinRotate);
         
        if (time >=0) {
            if (time - lastRotationChangeTime >= 150) {
                koinRotationSpeed *= -1;
                lastRotationChangeTime = time;
            }
            if (time % 285 <= 1) {
                koinRotate += 1; 
            } 
            if (time % 300  <= 1) {
                koinRotate -= 1;
            }
             
        } 

        MODEL_KOIN2 = LIBS.get_I4();
        koin2.MODEL_MATRIX = MODEL_KOIN2;
        koinDalam2.MODEL_MATRIX = MODEL_KOIN2;
        koinBalok2.MODEL_MATRIX = MODEL_KOIN2;

        LIBS.translateY(MODEL_KOIN2, 0);
        LIBS.translateX(MODEL_KOIN2, 0);
        LIBS.translateX(MODEL_KOIN2, koin2Movement);

        LIBS.scale(MODEL_KOIN2, koin2Scale, koin2Scale, koin2Scale);
        LIBS.translateY(MODEL_KOIN2, koin2Rotate);
         
        if (time >=0) {
            if (time - lastRotationChangeTime >= 150) {
                koin2RotationSpeed *= -1;
                lastRotationChangeTime = time;
            }
            if (time % 280 <= 1) {
                koin2Rotate += 1; 
            } 
            if (time % 300  <= 1) {
                koin2Rotate -= 1;
            } 
        } 

        MODEL_KOIN3 = LIBS.get_I4();
        koin3.MODEL_MATRIX = MODEL_KOIN3;
        koinDalam3.MODEL_MATRIX = MODEL_KOIN3;
        koinBalok3.MODEL_MATRIX = MODEL_KOIN3;

        LIBS.translateY(MODEL_KOIN3, 0);
        LIBS.translateX(MODEL_KOIN3, 0);
        LIBS.translateX(MODEL_KOIN3, koin2Movement);

        LIBS.scale(MODEL_KOIN3, koin3Scale, koin3Scale, koin3Scale);
        LIBS.translateY(MODEL_KOIN3, koin3Rotate);
         
        if (time >=0) {
            if (time - lastRotationChangeTime >= 150) {
                koin3RotationSpeed *= -1;
                lastRotationChangeTime = time;
            }
            if (time % 290 <= 1) {
                koin3Rotate += 1; 
            } 
            if (time % 300  <= 1) {
                koin3Rotate -= 1;
            }
             
        } 

        MODEL_DINO = LIBS.get_I4();
        KepalaDino.MODEL_MATRIX = MODEL_DINO;
        MoncongDino.MODEL_MATRIX = MODEL_DINO;
        MataRightDino.MODEL_MATRIX = MODEL_DINO;
        MataLeftDino.MODEL_MATRIX = MODEL_DINO;
        MataRightDalamDino.MODEL_MATRIX = MODEL_DINO;
        MataLeftDalamDino.MODEL_MATRIX = MODEL_DINO;
        MataRightPupilDino.MODEL_MATRIX = MODEL_DINO;
        MataLeftPupilDino.MODEL_MATRIX = MODEL_DINO;
        BadanDino.MODEL_MATRIX = MODEL_DINO;
        BadanDepanDino.MODEL_MATRIX = MODEL_DINO;
        SenyumDino.MODEL_MATRIX = MODEL_DINO;
        KakiKananDino.MODEL_MATRIX = MODEL_DINO;
        KakiKiriDino.MODEL_MATRIX = MODEL_DINO;
        Duri1Dino.MODEL_MATRIX = MODEL_DINO;
        Duri2Dino.MODEL_MATRIX = MODEL_DINO;
        Duri3Dino.MODEL_MATRIX = MODEL_DINO;
        BuntutDino.MODEL_MATRIX = MODEL_DINO;
        TanganKiriDino.MODEL_MATRIX = MODEL_DINO;
        TanganKananDino.MODEL_MATRIX = MODEL_DINO;
        TelapakKakiKananDino.MODEL_MATRIX = MODEL_DINO;
        TelapakKakiKiriDino.MODEL_MATRIX = MODEL_DINO;
        BawahTelapakKakiKananDino.MODEL_MATRIX = MODEL_DINO;
        BawahTelapakKakiKiriDino.MODEL_MATRIX = MODEL_DINO;
        LIBS.translateY(MODEL_DINO, -5);
        LIBS.translateX(MODEL_DINO, -50);
        LIBS.translateX(MODEL_DINO, dinoMovement);

        LIBS.rotateY(MODEL_DINO, 120);

        LIBS.scale(MODEL_DINO, dinoScale, dinoScale, dinoScale);
        LIBS.rotateY(MODEL_DINO, dinoRotate);
        if (time >= 0) {
            if (stopdinoMovement == false) {
                dinoMovementSpeed = 0.25;
            } else {
                dinoMovementSpeed = 0;
            }

            if (time - lastRotationChangeTime >= 100) {
                dinoRotationSpeed *= -1;
                lastRotationChangeTime = time;
            }

            if (time % 273 <= 1) {
                dinoRotationSpeed = 0.005;
            }

            if (time % 547 <= 1) {
                dinoRotationSpeed = 0.005;
            }

            if (time >= 3200 + 0) {
                LIBS.translateZ(MODEL_DINO, 15);
                stopdinoMovement = true;

                dinoRotationSpeed = 0.01;
            }

            if (time >= 10000 + 0) {
                dinoScaleSpeed = 0.008
            }

            if (time >= 11800 + 0) {
                dinoScaleSpeed = -0.015
            }
           
            if (time > 15100 + 26200) {
                stopdinoMovement = false;
                dinoRotationSpeed = 0.01;
                dinoMovementSpeed = 0;
                dinoScale = 1
                LIBS.translateX( MODEL_DINO, -10);
            }

        }
        
        KepalaDino.render(VIEW_MATRIX, PROJECTION_MATRIX);

        // Environment
        koin.render(VIEW_MATRIX, PROJECTION_MATRIX);

        koin2.render(VIEW_MATRIX, PROJECTION_MATRIX);

        koin3.render(VIEW_MATRIX, PROJECTION_MATRIX);

        pipe1.render(VIEW_MATRIX, PROJECTION_MATRIX);

        pipe2.render(VIEW_MATRIX, PROJECTION_MATRIX);

        pipe3.render(VIEW_MATRIX, PROJECTION_MATRIX);

        batangPohon.render(VIEW_MATRIX, PROJECTION_MATRIX);

        batangPohon2.render(VIEW_MATRIX, PROJECTION_MATRIX);

        // Shyguy
        SHYGUY_MODEL_MATRIX = LIBS.get_I4();
        shyGuy.MODEL_MATRIX = SHYGUY_MODEL_MATRIX;
        hoodie.MODEL_MATRIX = SHYGUY_MODEL_MATRIX;
        mata_kiri_shyguy.MODEL_MATRIX = SHYGUY_MODEL_MATRIX;
        mata_kanan_shyguy.MODEL_MATRIX = SHYGUY_MODEL_MATRIX;
        mulut.MODEL_MATRIX = SHYGUY_MODEL_MATRIX;
        badanShyGuy.MODEL_MATRIX = SHYGUY_MODEL_MATRIX;
        tangan_kiri_shyguy.MODEL_MATRIX = SHYGUY_MODEL_MATRIX;
        tangan_kanan_shyguy.MODEL_MATRIX = SHYGUY_MODEL_MATRIX;
        sepatu_kiri_shyguy.MODEL_MATRIX = SHYGUY_MODEL_MATRIX;
        sepatu_kanan_shyguy.MODEL_MATRIX = SHYGUY_MODEL_MATRIX;
        sabuk.MODEL_MATRIX = SHYGUY_MODEL_MATRIX;
        elemen_sabuk.MODEL_MATRIX = SHYGUY_MODEL_MATRIX;
        kacamata.MODEL_MATRIX = SHYGUY_MODEL_MATRIX;
        tali_kalung.MODEL_MATRIX = SHYGUY_MODEL_MATRIX;
        cinderamata.MODEL_MATRIX = SHYGUY_MODEL_MATRIX;

        
        LIBS.translateY(SHYGUY_MODEL_MATRIX, -20);
        LIBS.translateX(SHYGUY_MODEL_MATRIX, -50);
        LIBS.translateX(SHYGUY_MODEL_MATRIX, shyGuyMovement);
        LIBS.rotateY(SHYGUY_MODEL_MATRIX, 120);

        if (time >= 13100) {
            if (stopShyGuyMovement == false) {
                shyGuyMovementSpeed = 0.2;
            } else {
                shyGuyMovementSpeed = 0;
            }

            if (time - lastRotationChangeTime >= 150) {
                shyGuyRotationSpeed *= -1;
                lastRotationChangeTime = time;
            }

            if (time % 273 <= 2) {
                shyGuyRotationSpeed = 0.05;
            }

            if (time % 547 <= 2) {
                shyGuyRotationSpeed = - 0.05;
            }
        
            if (time >= 3200 + 13100) {
                stopShyGuyMovement = true;
                shyGuyRotationSpeed = 0.1;
            }

            if (time >= 10000 + 13100) {

                shyGuyScaleSpeed = 0.01
            }

            if (time >= 12000 + 13100) {
                shyGuyScaleSpeed = -0.02
            }

            if (time > 26200){
                shyGuyScaleSpeed = 0;
                shyGuyScale = 0;
                shyGuyRotationSpeed = 0;
            } 

            if (time > 15100 + 26200) {
                stopShyGuyMovement = false;
                shyGuyRotationSpeed = 0.01;
                shyGuyMovementSpeed = 0;
                shyGuyScale = 1
                LIBS.translateX(SHYGUY_MODEL_MATRIX, 40); // Move shyGuy to the right
            }

        }

        LIBS.scale(SHYGUY_MODEL_MATRIX, shyGuyScale, shyGuyScale, shyGuyScale);
        LIBS.rotateY(SHYGUY_MODEL_MATRIX, shyGuyRotate);

        shyGuy.render(VIEW_MATRIX, PROJECTION_MATRIX);

        // Toad
        var JAMUR_MATRIX = LIBS.get_I4();
        jamur.MODEL_MATRIX = JAMUR_MATRIX;
        topi.MODEL_MATRIX = JAMUR_MATRIX;
        mata_kiri.MODEL_MATRIX = JAMUR_MATRIX;
        mata_kanan.MODEL_MATRIX = JAMUR_MATRIX;
        putih_mata_kiri.MODEL_MATRIX = JAMUR_MATRIX;
        putih_mata_kanan.MODEL_MATRIX = JAMUR_MATRIX;
        topi_merah_1.MODEL_MATRIX = JAMUR_MATRIX;
        topi_merah_2.MODEL_MATRIX = JAMUR_MATRIX;
        topi_merah_3.MODEL_MATRIX = JAMUR_MATRIX;
        topi_merah_4.MODEL_MATRIX = JAMUR_MATRIX;
        bibir.MODEL_MATRIX = JAMUR_MATRIX;
        badan.MODEL_MATRIX = JAMUR_MATRIX;
        celana.MODEL_MATRIX = JAMUR_MATRIX;
        tangan_kiri.MODEL_MATRIX = JAMUR_MATRIX;
        tangan_kanan.MODEL_MATRIX = JAMUR_MATRIX;
        telapak_tangan_kanan.MODEL_MATRIX = JAMUR_MATRIX;
        telapak_tangan_kiri.MODEL_MATRIX = JAMUR_MATRIX;
        jari_telapak_tangan_kiri.MODEL_MATRIX = JAMUR_MATRIX;
        jari_telapak_tangan_kanan.MODEL_MATRIX = JAMUR_MATRIX;
        sabuk_ungu.MODEL_MATRIX = JAMUR_MATRIX;
        sabuk_kuning.MODEL_MATRIX = JAMUR_MATRIX;
        sepatu_kiri.MODEL_MATRIX = JAMUR_MATRIX;
        sepatu_kanan.MODEL_MATRIX = JAMUR_MATRIX;

        LIBS.translateY(JAMUR_MATRIX, -20);
        LIBS.translateY(JAMUR_MATRIX, -5);
        LIBS.translateX(JAMUR_MATRIX, -50);
        LIBS.translateX(JAMUR_MATRIX, jamurMovement);
        LIBS.rotateY(JAMUR_MATRIX, 120);

        if (time >= 26200) {
            if (stopjamurMovement == false) {
                jamurMovementSpeed = 0.2;
            } else {
                jamurMovementSpeed = 0;
            }
            console.log(jamurRotationSpeed);


            if (time - lastRotationChangeTime >= 100) {
                jamurRotationSpeed *= -1;
                lastRotationChangeTime = time;
            }

            if (time % 273 <= 2) {
                jamurRotationSpeed = 0.05;
            }

            if (time % 547 <= 2) {
                jamurRotationSpeed = - 0.05;
            }


            if (time >= 3200 + 26200) {
                stopjamurMovement = true;

                jamurRotationSpeed = 0.05;

            }

            if (time >= 12000 + 26200) {

                jamurScaleSpeed = 0.01
            }

            if (time >= 14000 + 26200) {
                jamurScaleSpeed = -0.02
            }

            if (time >= 15100 + 26200) {
                stopjamurMovement = false;
                jamurRotationSpeed = 0.01;
                jamurMovementSpeed = 0;
                jamurScale = 1
                LIBS.translateX( JAMUR_MATRIX, -70);
            }

        }
        
        LIBS.scale(JAMUR_MATRIX, jamurScale, jamurScale, jamurScale);
        LIBS.rotateY(JAMUR_MATRIX, jamurRotate);

        jamur.render(VIEW_MATRIX, PROJECTION_MATRIX);

        window.requestAnimationFrame(animate);

    };
    animate(0);
}
window.addEventListener('load', main);