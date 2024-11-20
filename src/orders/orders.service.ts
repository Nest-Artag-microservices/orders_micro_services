import { HttpStatus, Inject, Injectable, Logger, OnModuleInit,} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { PrismaClient } from '@prisma/client';
import { ClientProxy, Payload, RpcException } from '@nestjs/microservices';
import { OrderPaginationDto } from './dto/order-pagination.dto';
import { ChangeOrderStatusDto } from './dto';
import { PRODUCTS_SERVICE } from 'src/config';
import { first, firstValueFrom } from 'rxjs';


@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit {


  constructor(
    @Inject(PRODUCTS_SERVICE) private readonly productClient: ClientProxy
  ) {
    super();
  }
  private readonly logger = new Logger(`OrdersService`);

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connected');
  }

  async create(createOrderDto: CreateOrderDto) {
    try{
      //1 confirmar que los productos existen

      const productIds = createOrderDto.items.map(item => item.productId);
      const products: any[] = await firstValueFrom( 
        this.productClient.send({ cmd:'validate_product'}, productIds));
      //2 calculo el total de los valores
      const totalAmount  = createOrderDto.items.reduce((acc,orderItem)=>{
        const price = products.find(product => product.id === orderItem.productId)
        .price;
        return price * orderItem.quantity 
      },0);

      const totalItems = createOrderDto.items.reduce((acc,orderItem)=>{
        return acc + orderItem.quantity
      },0);
      
      //crear una transsaccion de base de datos
      const order = await this.order.create({
        data: {
          totalAmount,
          totalItems,
          OrderItem: {
            createMany:{
              data: createOrderDto.items.map((orderItem)=>({
                productId: orderItem.productId,
                quantity: orderItem.quantity,
                price: products.find(product => product.id === orderItem.productId).price
              }))
            }
          }
        },
        include: {
          OrderItem: {
            select: {
              price: true,
              quantity: true,
              productId: true
            }
          }
        }
      })

        return {
          ...order,
          OrderItem: order.OrderItem.map((orderItem)=>({
           ...orderItem,
           name: products.find(product => product.id === orderItem.productId)
           .name
          }))
        }
    }catch(e){
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: "Check logs"
      })
    }

   

   
  }

  async findAll(orderPaginationDto: OrderPaginationDto) {
  const totalPages = await this.order.count({
    where: {
      status: orderPaginationDto.status
  }})
  const currentPage= orderPaginationDto.page || 1;
  const perPage = orderPaginationDto.limit || 10;

  return {
    data:await this.order.findMany({
      skip:(currentPage -1 )* perPage,
      take: perPage,
      where:{
        status:orderPaginationDto.status
      }
    }),
    meta:{
      total:totalPages,
      page:currentPage,
      lastPage: Math.ceil(totalPages/perPage)
    }
  } 

  }

  async findOne(id: string) {

    const order = await this.order.findFirst({
      where: { id },
      include: {
        OrderItem: {
          select: {
            price: true,
            productId: true,
            quantity: true
          }
        }
      }
    });

    if ( !order ) {
      throw new RpcException({ 
        status: HttpStatus.NOT_FOUND, 
        message: `Order with id ${ id } not found`
      });
    }

    const productIds= order.OrderItem.map(orderItem => orderItem.productId);
    const products: any[] = await firstValueFrom( 
      this.productClient.send({ cmd:'validate_product'}, productIds));



    return {
      ...order,
      OrderItem:order.OrderItem.map((orderItem)=>({
        ...orderItem,
        name:products.find(product => product.id === orderItem.productId).name
      }))
    }

  }
 async changeStatus(changeOrderStatusDto:ChangeOrderStatusDto){
  const {id,status} = changeOrderStatusDto;
  const order = await this.findOne(id);

  if(order.status === status){
   return order
 }

 if(!order){
  throw new RpcException({
    status:HttpStatus.NOT_FOUND,
    message:`Order with id ${id} not found`
  })
 }

  return this.order.update({
    where:{id},
    data:{status}
  })
 }
}
