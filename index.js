require('dotenv').config()
const { SUPABASE_URL, SUPABASE_TOKEN, HCAPTCHA_SECRET, PORT } = process.env
const H_CAPTCHA_URL = 'https://hcaptcha.com/siteverify'
const port = PORT || 3001
// Crear servidor
// Crear end point para recibir el formulario de contacto
// Validar el formulario
// Enviar el captcha y validar que no sea un bot
// Almacenar los datos en supabase
// Enviar un correo con los datos al usuario

const cors = require('cors')
const express = require('express')
const app = express()

const { default: axios } = require('axios')

const { createClient } = require('@supabase/supabase-js')
const supabase = createClient(SUPABASE_URL, SUPABASE_TOKEN)

const nodemailer = require('nodemailer')
const transporter = nodemailer.createTransport({
  port: 465, // smtp port
  host: 'smtp.gmail.com', // smtp server
  auth: {
    user: 'sender@example.com',
    pass: 'password'
  },
  secure: true // true for 465, false for other ports
})

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

/*#######################################################################*/
/*######################## FUNCIONES INTERNAS ###########################*/
/*#######################################################################*/

const validateCaptcha = async req => {
  // Preparamos la petición de verificación de captcha a hcaptcha
  const {
    body: { 'h-captcha-response': token }
  } = req
  const body = `response=${token}&secret=${HCAPTCHA_SECRET}`
  const headers = { 'Content-type': 'application/x-www-form-urlencoded' }
  const options = { headers, method: 'POST' }
  console.log(body)
  return await axios.post(H_CAPTCHA_URL, body, options)
}

const mailData = ({ email, message, name, subject }) => {
  return {
    from: email, // sender address
    to: 'receiver@mail.com', // list of receivers
    subject: subject,
    text: `By ${name}: \n\n ${message} \n ${email}`
  }
}

const saveData = async data => {
  const { email, message, name, subject } = data

  // enviamos el correo con la data :D
  transporter.sendMail(mailData(data), (err, info) => {
    if (err) console.log(err)
    else console.log(info)
  })

  return await supabase
    .from('contact')
    .insert({ email, message, name, subject }, 'minimal')
}

/*#######################################################################*/
/*########################### RUTAS DE LA API ###########################*/
/*#######################################################################*/

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.post('/verify', (req, res) => {
  // enviamos la request y manejamos la respuesta
  validateCaptcha(req).then(response => {
    console.log(response.data)
    if (response.data.success) {
      // Como es true entonces almacenamos los datos en supabase
      saveData(req.body).then(value => {
        const { error, status, statusText } = value
        if (error) {
          return res.status(status).send({ error, statusText, success: false })
        }
        console.log(value)
        return res.status(status).send({ statusText, success: true })
      })
    } else {
      res.send({ error: 'Hubo un error en el servidor' }).status(500)
    }
  })
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
