import { Server, Request, ResponseToolkit } from '@hapi/hapi';
import { Types } from 'mongoose';
import Joi from 'joi';
import Boom from '@hapi/boom';
import {
  DATABASE_MODELS,
  PositionModel,
  POSITION_EVENTS
} from '@jwd-crypto-signals/common';

const positionRoutes = {
  name: 'position routes',
  version: '1.0.0',
  register(server: Server) {
    server.route({
      method: 'POST',
      path: '/sell/{id}',
      options: {
        auth: false,
        validate: {
          params: {
            id: Joi.string()
              .trim()
              .custom((value: string, helpers: Joi.CustomHelpers<string>) => {
                if (!Types.ObjectId.isValid(value)) {
                  return helpers.error('any.invalid');
                }

                return value;
              })
              .exist()
          }
        }
      },
      async handler(request: Request, h: ResponseToolkit) {
        try {
          const positionModel: PositionModel =
            server.plugins.mongoose.connection.model(DATABASE_MODELS.ORDER);
          const id = request.params.id as string;
          const position = await positionModel
            .findById(new Types.ObjectId(id))
            .lean();

          if (!position) {
            return Boom.notFound('Position does not exist.');
          }

          server.plugins.broker.publish(
            POSITION_EVENTS.POSITION_CLOSED,
            position
          );

          return h.response();
        } catch (error) {
          return Boom.internal();
        }
      }
    });
  }
};

export { positionRoutes };
