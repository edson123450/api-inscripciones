
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
        const { 'tenant_id#c_estudiante': tenantIdEstudiante } = event.body;

        // Configurar los parámetros para la consulta
        const params = {
            TableName: 'tabla_inscripciones',
            KeyConditionExpression: '#tenantKey = :tenantValue',
            ExpressionAttributeNames: {
                '#tenantKey': 'tenant_id#c_estudiante', // Alias para la partition key
            },
            ExpressionAttributeValues: {
                ':tenantValue': tenantIdEstudiante,
            },
        };

        // Ejecutar la consulta en DynamoDB
        const data = await dynamoDB.query(params).promise();

        // Filtrar los datos_inscripcion con estado "Pendiente"
        const resultados = data.Items.filter(item =>
            item.datos_inscripcion?.estado === 'Pendiente'
        );

        // Crear la respuesta elemento por elemento
        const respuesta = resultados.map(item => ({
            c_estudiante: item.c_estudiante,
            tenant_id_programa: item['tenant_id#c_programa'],
            tenant_id_estudiante: item['tenant_id#c_estudiante'],
            estado: item.datos_inscripcion?.estado,
            monto: item.datos_inscripcion?.monto,
            c_programa: item.c_programa,
        }));

        // Retornar los datos filtrados con formato JSON bien estructurado
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                status: 'success',
                data: respuesta,
            }, null, 2),
        };
    } catch (error) {
        console.error('Error al consultar DynamoDB o validar el token:', error);

        // Retornar error en caso de fallo
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                status: 'error',
                message: 'Ocurrió un error al procesar la solicitud.',
                error: error.message,
            }, null, 2),
        };
    }
};
