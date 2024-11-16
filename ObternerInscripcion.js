// Importar el SDK de AWS
const AWS = require('aws-sdk');

// Configurar DynamoDB
const dynamoDB = new AWS.DynamoDB.DocumentClient();

exports.lambda_handler = async (event) => {
    // Obtener valores del cuerpo de la solicitud
    const { 'tenant_id#c_estudiante': tenantIdEstudiante } = event.body;

    try {
        // Consulta a DynamoDB usando la partition key
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

        // Ejecutar consulta
        const data = await dynamoDB.query(params).promise();

        // Filtrar los datos_inscripcion con estado "Pendiente"
        const resultados = data.Items.filter(item => 
            item.datos_inscripcion?.estado === 'Pendiente'
        );

        // Retornar los datos filtrados
        return {
            statusCode: 200,
            body: JSON.stringify({
                status: 'success',
                data: resultados,
            }),
        };
    } catch (error) {
        console.error('Error al consultar DynamoDB:', error);

        // Retornar el error en caso de fallo
        return {
            statusCode: 500,
            body: JSON.stringify({
                status: 'error',
                message: 'Ocurrió un error al procesar la solicitud.',
            }),
        };
    }
};