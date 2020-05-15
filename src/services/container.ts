import * as ClassValidator from 'class-validator';
import { Container } from 'typedi';
import * as TypeORM from 'typeorm';

// register 3rd party IOC container
TypeORM.useContainer(Container);
ClassValidator.useContainer(Container);
