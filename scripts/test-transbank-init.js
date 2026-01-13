import pkg from 'transbank-sdk';
const { WebpayPlus, Options, IntegrationApiKeys, Environment, IntegrationCommerceCodes } = pkg;

console.log('Iniciando prueba de Transbank SDK...');

try {
    const commerceCode = IntegrationCommerceCodes.WEBPAY_PLUS;
    const apiKey = IntegrationApiKeys.WEBPAY;
    const environment = Environment.Integration;

    console.log(`Config: CC=${commerceCode}, Env=${environment}`);

    const tx = new WebpayPlus.Transaction(new Options(commerceCode, apiKey, environment));
    console.log('Transacción instanciada correctamente.');

    // No podemos crear una transacción real sin conectividad, pero si llegamos aquí, los imports funcionan.
    console.log('✅ SDK cargado sin errores de "Dynamic require" ni de importación.');

} catch (error) {
    console.error('❌ Error al usar Transbank SDK:', error);
}
