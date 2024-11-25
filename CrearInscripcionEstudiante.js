// Importar el SDK de AWS
const AWS = require('aws-sdk');

// Configurar el cliente de DynamoDB
const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    try {
        // Obtener el token del encabezado
        const token = event.headers?.Authorization;
        if (!token) {
            return {
                statusCode: 401,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status: 'error',
                    message: 'Token no proporcionado. Acceso no autorizado.',
                }, null, 2),
            };
        }

        // Invocar el Lambda para validar el token
        const payload = { token };
        const invokeParams = {
            FunctionName: 'ValidarTokenEstudiante', // Nombre del Lambda de validación
            InvocationType: 'RequestResponse',
            Payload: JSON.stringify(payload),
        };

        const invokeResponse = await lambdaClient.invoke(invokeParams).promise();
        const validationResponse = JSON.parse(invokeResponse.Payload);

        if (validationResponse.statusCode === 403) {
            return {
                statusCode: 403,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status: 'error',
                    message: 'Acceso no autorizado. Token inválido.',
                }, null, 2),
            };
        }











        // Validar que el body contiene los campos necesarios
        const body = JSON.parse(event.body);
        const { "tenant_id#c_estudiante": tenantIdEstudiante, c_programa, datos_inscripcion } = body;

        if (!tenantIdEstudiante || !c_programa || !datos_inscripcion) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: "Los campos 'tenant_id#c_estudiante', 'c_programa' y 'datos_inscripcion' son obligatorios."
                })
            };
        }

        // Generar el campo 'tenant_id#c_programa' según la estructura
        const tenantIdPrograma = `${tenantIdEstudiante.split('#')[0]}#${c_programa}`;

        // Construir el elemento para insertar en la tabla
        const item = {
            "tenant_id#c_estudiante": tenantIdEstudiante,
            "c_programa": c_programa,
            "datos_inscripcion": datos_inscripcion,
            "tenant_id#c_programa": tenantIdPrograma
        };

        // Configurar los parámetros para insertar el elemento en la tabla
        const params = {
            TableName: "tabla_inscripciones",
            Item: item
        };

        // Insertar el elemento en la tabla
        await dynamodb.put(params).promise();

        // Responder con éxito
        return {
            statusCode: 201,
            body: JSON.stringify({
                message: "Inscripción creada exitosamente.",
                data: item
            })
        };
    } catch (error) {
        console.error("Error al crear la inscripción:", error);

        // Responder con error en caso de fallo
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: "Error al crear la inscripción.",
                error: error.message
            })
        };
    }
};