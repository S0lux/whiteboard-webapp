import { OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Board } from "src/boards/entities/board.entity";
import { Path } from "src/paths/entities/path.entity";
import { Shape } from "src/shapes/entities/shape.entity";
import { Team } from "src/teams/entities/team.entity";
import { UserTeam } from "src/teams/entities/user-team-relation.entity";
import { Repository } from "typeorm";

@WebSocketGateway()
export class BoardGateWay implements OnModuleInit {
    constructor(
        @InjectRepository(UserTeam) private readonly userTeamRepository: Repository<UserTeam>,
        @InjectRepository(Board) private readonly boardRepository: Repository<Board>,
        @InjectRepository(Shape) private readonly shapeRepository: Repository<Shape>,
        @InjectRepository(Path) private readonly pathRepository: Repository<Path>,
    ) {
    }

    @WebSocketServer()
    server: Server;

    onModuleInit() {
        this.server.on("connection", async (socket: Socket) => {
            const user = (socket.request as any).user;
            if (user) {
                socket.on("joinBoard", async (boardId: number) => {
                    const board = await this.boardRepository.findOne({
                        where: { id: boardId },
                        relations: ["team"],
                    });
                    if (!board) {
                        console.log(`Board ${boardId} not found`);
                        return;
                    }
                    const isAuthorized = await this.isUserInTeam(user.id, board.team.id);
                    if (!isAuthorized) {
                        console.log(`User ${user.id} is not authorized to access board ${boardId}`);
                        return;
                    }
                    socket.join(`board:${boardId}`);
                    // socket.to(`board:${boardId}`).emit("user-joined", { boardId, userId: user.id });
                    console.log(`User ${user.id} joined board ${boardId}`);
                });

                socket.on("add-node", async (payload: { boardId: number, data: any }) => {
                    try {
                        const board = await this.boardRepository.findOne({ where: { id: payload.boardId } });
                        if (!board) {
                            console.log("Board not found");
                            return;
                        }
                        const shape = new Shape();
                        shape.id = payload.data.id;
                        shape.data = payload.data;
                        shape.board = board;
                        await this.shapeRepository.save(shape);
                        console.log("Shape saved");
                        socket.to(`board:${payload.boardId}`).emit("add-node", { boardId: payload.boardId, data: payload.data });
                    } catch (err) {
                        console.error(err);
                    }
                })

                socket.on("add-path", async (payload: { boardId: number, data: any }) => {
                    try {
                        const board = await this.boardRepository.findOne({ where: { id: payload.boardId } });
                        if (!board) {
                            console.log("Board not found");
                            return;
                        }
                        const path = new Path();
                        path.id = payload.data.id;
                        path.data = payload.data;
                        path.board = board;
                        await this.pathRepository.save(path);
                        console.log("Path saved");
                        socket.to(`board:${payload.boardId}`).emit("add-path", { boardId: payload.boardId, data: payload.data });
                    } catch (err) {
                        console.error(err);
                    }
                })

                socket.on("update-node", async (payload: { boardId: number, nodeId: string, data: any }) => {
                    try {
                        const board = await this.boardRepository.findOne({ where: { id: payload.boardId } });
                        if (!board) {
                            console.log("Board not found");
                            return;
                        }
                        const shape = await this.shapeRepository.findOne({ where: { id: payload.nodeId } });
                        if (!shape) {
                            console.log("Shape not found");
                            return;
                        }
                        shape.data = payload.data;
                        await this.shapeRepository.save(shape);
                        console.log("Shape updated");
                        socket.to(`board:${payload.boardId}`).emit("update-node", { boardId: payload.boardId, nodeId: payload.nodeId, data: payload.data });
                    } catch (err) {
                        console.error(err);
                    }
                })

                socket.on("update-path", async (payload: { boardId: number, pathId: string, data: any }) => {
                    try {
                        const board = await this.boardRepository.findOne({ where: { id: payload.boardId } });
                        if (!board) {
                            console.log("Board not found");
                            return;
                        }
                        const path = await this.pathRepository.findOne({ where: { id: payload.pathId } });
                        if (!path) {
                            console.log("Path not found");
                            return;
                        }
                        path.data = payload.data;
                        await this.pathRepository.save(path);
                        console.log("Path updated");
                        socket.to(`board:${payload.boardId}`).emit("update-path", { boardId: payload.boardId, pathId: payload.pathId, data: payload.data });
                    } catch (err) {
                        console.error(err);
                    }
                })



            }
            else {
                console.log("User not found");
            }
        });
    }

    private async isUserInTeam(userId: number, teamId: number): Promise<boolean> {
        const userTeam = await this.userTeamRepository.findOne({
            where: { user: { id: userId }, team: { id: teamId } },
        });
        return !!userTeam;
    }

}