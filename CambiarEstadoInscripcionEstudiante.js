// Importar el SDK de AWS
const AWS = require("aws-sdk");

// Configurar DynamoDB
const dynamoDB = new AWS.DynamoDB.DocumentClient();

exports.lambda_handler = async (event) => {
  try {
    // Obtener el token del encabezado
    const token = event.headers?.Authorization;
    if (!token) {
      return {
        statusCode: 401,
        headers: {
          "Content-Type": "application/json",
        },
        body: {
          status: "error",
          message: "Token no proporcionado. Acceso no autorizado.",
        },
      };
    }

    // Validar el token (aquí asumimos que la validación ya se realiza en otro Lambda)

    // Parsear el cuerpo de la solicitud
    let tenantId, c_estudiante, c_programa, datosInscripcion;
    if (typeof event.body === "string") {
      const parsedBody = JSON.parse(event.body);
      tenantId = parsedBody["tenant_id"];
      c_estudiante = parsedBody["c_estudiante"];
      c_programa = parsedBody["c_programa"];
      datosInscripcion = parsedBody["datos_inscripcion"];
    } else {
      tenantId = event.body["tenant_id"];
      c_estudiante = event.body["c_estudiante"];
      c_programa = event.body["c_programa"];
      datosInscripcion = event.body["datos_inscripcion"];
    }

    // Generar los valores compuestos
    const tenantIdEstudiante = `${tenantId}#${c_estudiante}`;
    const tenantIdPrograma = `${tenantId}#${c_programa}`;

    // Preparar el body para actualizar en DynamoDB
    const itemToUpdate = {
      "tenant_id#c_estudiante": tenantIdEstudiante,
      c_programa: c_programa,
      datos_inscripcion: {
        estado: datosInscripcion.estado,
        monto: datosInscripcion.monto,
      },
      "tenant_id#c_programa": tenantIdPrograma,
    };

    // Configurar los parámetros para actualizar en DynamoDB
    const params = {
      TableName: "tabla_inscripciones",
      Item: itemToUpdate,
    };

    // Actualizar el item en DynamoDB
    await dynamoDB.put(params).promise();

    // Retornar una respuesta exitosa
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: {
        status: "success",
        message: "Estado de inscripción actualizado exitosamente.",
        updatedItem: itemToUpdate,
      },
    };
  } catch (error) {
    console.error("Error al actualizar inscripción en DynamoDB:", error);

    // Retornar error en caso de fallo
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
      },
      body: {
        status: "error",
        message: "Ocurrió un error al procesar la solicitud.",
        error: error.message,
      },
    };
  }
};
