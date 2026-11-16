window.MEVA_EVENTOS_CONFIG = {
  minQuantity: 10,
  maxAutoQuantity: 100,
  products: {
    llavero_tela: {
      name: "Llavero de tela",
      description: "Elección de tejido disponible, sin bordado.",
      tiers: [
        {min:10,max:30,price:3.00},
        {min:31,max:50,price:2.50},
        {min:51,max:79,price:2.00},
        {min:80,max:100,price:1.75}
      ],
      personalization: [{id:"none", label:"Sin bordado", extra:0}]
    },
    llavero_bordado: {
      name: "Llavero bordado",
      description: "Bordado sencillo incluido cuando es igual en todas las unidades.",
      tiers: [
        {min:10,max:30,price:4.00},
        {min:31,max:50,price:3.50},
        {min:51,max:79,price:3.00},
        {min:80,max:100,price:2.75}
      ],
      personalization: [
        {id:"same", label:"Mismo bordado en todas", extra:0},
        {id:"names", label:"Nombres diferentes", extra:1.00}
      ]
    },
    scrunchie: {
      name: "Scrunchie",
      description: "Elección de tejido disponible, sin bordado.",
      tiers: [
        {min:10,max:30,price:3.00},
        {min:31,max:50,price:2.50},
        {min:51,max:79,price:2.00},
        {min:80,max:100,price:1.75}
      ],
      personalization: [{id:"none", label:"Sin bordado", extra:0}]
    }
  },
  packaging: [
    {id:"basic", label:"Básico", description:"Etiqueta MEVA y entrega agrupada", extra:0},
    {id:"card", label:"Tarjeta personalizada", description:"Tarjeta personalizada por unidad", extra:0.40},
    {id:"gift", label:"Regalo completo", description:"Tarjeta + bolsita individual", extra:0.80}
  ]
};