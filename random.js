    process.on('message', msg => {
        let cant = parseInt(msg.cant)

        valores = {}
        for (let i = 0; i < cant; i++) {
            const num = getRandomInt()
     
            if(num in valores) valores[num]++
            else valores[num] = 1
        }
    
        process.send(valores)
    })

    const getRandomInt = (min = 1, max = 1000) => {
        return Math.floor(Math.random() * (max - min +1)+ min);
      }