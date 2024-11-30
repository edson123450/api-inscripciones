// Importar el SDK de AWS
const AWS = require('aws-sdk');

// Configurar DynamoDB
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const lambdaClient = new AWS.Lambda(); // Cliente para invocar otro Lambda

exports.lambda_handler = async (event) => {
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

        // Obtener valores del cuerpo de la solicitud
        let tenant_id, c_estudiante, c_programa;
        if (typeof event.body === 'string') {
            const parsedBody = JSON.parse(event.body);
            tenant_id = parsedBody['tenant_id'];
            c_estudiante = parsedBody['c_estudiante'];
            c_programa = parsedBody['c_programa'];
        } else {
            tenant_id = event.body['tenant_id'];
            c_estudiante = event.body['c_estudiante'];
            c_programa = event.body['c_programa'];
        }

        // Construir el valor del campo 'tenant_id#c_estudiante'
        const tenantIdEstudiante = `${tenant_id}#${c_estudiante}`;

        // Configurar los parámetros para la consulta en DynamoDB
        const params = {
            TableName: 'tabla_inscripciones',
            Key: {
                'tenant_id#c_estudiante': tenantIdEstudiante,
                'c_programa': c_programa,
            },
        };

        // Ejecutar la consulta en DynamoDB
        const data = await dynamoDB.get(params).promise();

        // Verificar si se encontró el elemento
        if (!data.Item) {
            return {
                statusCode: 404,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: {
                    status: 'error',
                    message: 'No se encontró la inscripción con los datos proporcionados.',
                },
            };
        }

        // Retornar los datos de la inscripción
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
            },
            body: {
                status: 'success',
                datos_inscripcion: data.Item.datos_inscripcion,
            }
        };
    } catch (error) {
        console.error('Error al consultar DynamoDB o validar el token:', error);

        // Retornar error en caso de fallo
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
            },
            body: {
                status: 'error',
                message: 'Ocurrió un error al procesar la solicitud.',
                error: error.message,
            },
        };
    }
};
