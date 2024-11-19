import { HttpStatus, Injectable, Logger, OnModuleInit, Query } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { PrismaClient } from '@prisma/client';
import { Payload, RpcException } from '@nestjs/microservices';
import { OrderPaginationDto } from './dto/order-pagination.dto';
import { ChangeOrderStatusDto } from './dto';


@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit {

  private readonly logger = new Logger(`OrdersService`);

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connected');
  }

  create(createOrderDto: CreateOrderDto) {

    return {
      service: 'orders',
      data: createOrderDto
    }
   // return this.order.create({ data: createOrderDto });
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
      where: { id }
    });

    if ( !order ) {
      throw new RpcException({ 
        status: HttpStatus.NOT_FOUND, 
        message: `Order with id ${ id } not found`
      });
    }

    return order;

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
