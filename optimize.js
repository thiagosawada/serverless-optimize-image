'use strict';

const AWS = require('aws-sdk');
const sharp = require('sharp');
// Nome e extensão da imagem
const { basename, extname } = require('path');

const S3 = new AWS.S3();

module.exports.handle = async ({ Records: records }) => {
  try {
    // Promise.all porque o map não espera a função finalizar e retornar uma promise
    await Promise.all(records.map(async record => {
      // Todo o caminho da imagem, definido no prefix em serverless.yml
      // /uploads/nome_da_imagem.png
      const { key } = record.s3.object;

      const image = await S3.getObject({
        Bucket: process.env.bucket,
        Key: key,
      }).promise();

      const optimized = await sharp(image.Body)
        // para não distorcer a imagem, respeitando a altura e a largura definidas
        .resize(1280, 720, { fit: 'inside', withoutEnlargement: true })
        // sempre converte para jpeg, com menor perda de qualidade, que é reduzida em 50%
        .toFormat('jpeg', { progressive: true, quality: 50 })
        .toBuffer() // coverte a escrita da imagem em buffer

      // Salvar a imagem no S3
      await S3.putObject({
        Body: optimized,
        Bucket: process.env.bucket,
        ContentType: 'image/jpeg',
        // Traz o nome da imagem sem a extensão
        Key: `compressed/${basename(key, extname(key))}.jpeg`
      }).promise();

    }));

    return {
      statusCode: 201,
      body: {}
    }
  } catch (err) {
    return err;
  }
};
