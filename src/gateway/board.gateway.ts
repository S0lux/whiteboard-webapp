import { OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Board } from "src/boards/entities/board.entity";
import { UserBoard } from "src/boards/entities/user_board.entity";
import { Path } from "src/paths/entities/path.entity";
import { Shape } from "src/shapes/entities/shape.entity";
import { LoggedInUser, Presentation, UserJoinedPayload } from "src/shared/types/board-socket.type";
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
        @InjectRepository(UserBoard) private readonly userBoardRepository: Repository<UserBoard>,
    ) {
    }

    @WebSocketServer()
    server: Server;

    boardUsers = new Map<number, Map<string, LoggedInUser>>();
    presentationUsers = new Map<number, Map<string, LoggedInUser>>();

    currentBoardId: number | null = null;

    onModuleInit() {
        this.server.on("connection", async (socket: Socket) => {
            const user = (socket.request as any).user;
            if (user) {
                socket.on("joinBoard", async (boardId: number) => {
                    await this.handleJoinBoard(socket, user, boardId);
                });

                socket.on("add-node", async (payload: { boardId: number, data: any }) => {
                    await this.handleAddNode(socket, payload);
                });

                socket.on("add-path", async (payload: { boardId: number, data: any }) => {
                    await this.handleAddPath(socket, payload);
                });

                socket.on("update-node", async (payload: { boardId: number, nodeId: string, data: any }) => {
                    await this.handleUpdateNode(socket, payload);
                });

                socket.on("update-path", async (payload: { boardId: number, pathId: string, data: any }) => {
                    await this.handleUpdatePath(socket, payload);
                });


                socket.on("start-presentation", async (payload: { boardId: number, data: Presentation }) => {
                    await this.handleStartPresentation(socket, payload.boardId, user, payload.data);
                });

                socket.on("join-presentation", async (boardId: number) => {
                    await this.handleJoinPresentation(socket, user, boardId);
                })

                socket.on("drag-while-presenting", async (payload: { boardId: number, data: Presentation }) => {
                    await this.handleDragWhilePresentation(socket, payload.boardId, payload.data);
                })

                socket.on("leave-presentation", async (boardId: number) => {
                    await this.handleLeavePresentation(socket, boardId);
                })

                socket.on("end-presentation", async () => {
                    await this.handleEndPresentation(socket);
                })

                socket.on("disconnect", async () => {
                    await this.handleDisconnect(socket);
                });
            }
            else {
                console.log("User not found");
            }
        });
    }

    private async handleDragBoard(socket: Socket, payload: { boardId: number, data: any }) {
        const board = await this.boardRepository.findOne({
            where: { id: payload.boardId },
            relations: ["team"],
        });
        if (!board) {
            console.log(`Board ${payload.boardId} not found`);
            return;
        }
        const userBoard = await this.userBoardRepository.findOne({
            where: {
                user: { id: (socket.request as any).user.id },
                board: { id: payload.boardId }
            },
        });
        if (!userBoard) {
            let newUserBoard = new UserBoard({ board, user: (socket.request as any).user, data: payload.data });
            await this.userBoardRepository.save(newUserBoard);
        }
        else {
            userBoard.data = payload.data;
            await this.userBoardRepository.save(userBoard);
        }
    }

    private async handleJoinPresentation(socket: Socket, user: LoggedInUser, boardId: number) {
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

        if (this.currentBoardId !== null) {
            socket.leave(`board:${this.currentBoardId}`);
            socket.leave(`board-presentation:${this.currentBoardId}`)
        }

        const userTeam = await this.userTeamRepository.findOne({
            where: {
                user: { id: user.id },
                team: { id: board.team.id }
            },
        });

        if (!userTeam) {
            console.log(`User ${user.id} is not authorized to access board ${boardId}`);
            return;
        }

        const enhancedUser: LoggedInUser = {
            ...user,
            permission: userTeam.permission
        };

        this.currentBoardId = boardId;

        socket.join(`board-presentation:${boardId}`);
        if (!this.presentationUsers.has(boardId)) {
            this.presentationUsers.set(boardId, new Map<string, LoggedInUser>());
        }
        this.presentationUsers.get(boardId)?.set(socket.id, enhancedUser as LoggedInUser);

        const presentationUsersArray = Array.from(this.presentationUsers.get(boardId)?.entries() ?? []).map(([socketId, enhancedUser]) => ({
            socketId,
            enhancedUser,
        }));

        socket.to(`board-presentation:${boardId}`).emit("presentation-users", presentationUsersArray);
        socket.emit("join-presentation", presentationUsersArray);
        console.log(`User ${user.id} joined presentation on board ${boardId}`);

    }

    private async handleLeavePresentation(socket: Socket, boardId: number) {
        if (this.currentBoardId === null) {
            return;
        }
        const presentationUsers = this.presentationUsers.get(this.currentBoardId);
        if (presentationUsers) {
            presentationUsers.delete(socket.id);
        }
        socket.to(`board-presentation:${this.currentBoardId}`).emit("leave-presentation", socket.id);
    }

    private async handleStartPresentation(socket: Socket, boardId: number, user: LoggedInUser, data: Presentation) {
        if (this.currentBoardId === null) {
            return;
        }
        const board = await this.boardRepository.findOne({
            where: { id: boardId },
            relations: ["team"],
        });
        if (!board) {
            console.log(`Board ${boardId} not found`);
            return;
        }

        board.presentation = data;
        await this.boardRepository.save(board);

        socket.to(`board:${boardId}`).emit("start-presentation", data);
        console.log(`User ${user.id} started presentation on board ${boardId}`);
        this.handleJoinPresentation(socket, user, boardId);

    }

    private async handleEndPresentation(socket: Socket) {
        if (this.currentBoardId === null) {
            return;
        }
        const presentationUsers = this.boardUsers.get(this.currentBoardId);
        if (presentationUsers) {
            presentationUsers.delete(socket.id);
        }

        const board = await this.boardRepository.findOne({
            where: { id: this.currentBoardId },
            relations: ["team"],
        });
        if (!board) {
            console.log(`Board ${this.currentBoardId} not found`);
            return;
        }

        board.presentation = null;
        await this.boardRepository.save(board);
        socket.to(`board-presentation:${this.currentBoardId}`).emit("end-presentation", socket.id);
        console.log(`User ${socket.id} ended presentation on board ${this.currentBoardId}`);
    }

    private async handleDragWhilePresentation(socket: Socket, boardId: number, data: Presentation) {
        const board = await this.boardRepository.findOne({
            where: { id: boardId },
            relations: ["team"],
        });
        if (!board) {
            console.log(`Board ${boardId} not found`);
            return;
        }

        board.presentation = data;
        await this.boardRepository.save(board);

        socket.to(`board-presentation:${boardId}`).emit("drag-while-presentating", data);
    }

    private async handleJoinBoard(socket: Socket, user: LoggedInUser, boardId: number) {
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

        if (this.currentBoardId !== null) {
            socket.leave(`board:${this.currentBoardId}`);
        }

        const userTeam = await this.userTeamRepository.findOne({
            where: {
                user: { id: user.id },
                team: { id: board.team.id }
            },
        });

        if (!userTeam) {
            console.log(`User ${user.id} is not authorized to access board ${boardId}`);
            return;
        }

        const enhancedUser: LoggedInUser = {
            ...user,
            permission: userTeam.permission
        };

        this.currentBoardId = boardId;

        socket.join(`board:${boardId}`);

        if (!this.boardUsers.has(boardId)) {
            this.boardUsers.set(boardId, new Map<string, LoggedInUser>());
        }
        this.boardUsers.get(boardId)?.set(socket.id, enhancedUser as LoggedInUser);

        const boardUsersArray = Array.from(this.boardUsers.get(boardId)?.entries() ?? []).map(([socketId, enhancedUser]) => ({
            socketId,
            enhancedUser,
        }));


        socket.to(`board:${boardId}`).emit("board-users", boardUsersArray);
        socket.emit("user-joined", boardUsersArray);

        console.log(`User ${user.id} joined board ${boardId}`);
    }

    private async handleAddNode(socket: Socket, payload: { boardId: number, data: any }) {
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
    }

    private async handleAddPath(socket: Socket, payload: { boardId: number, data: any }) {
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
    }

    private async handleUpdateNode(socket: Socket, payload: { boardId: number, nodeId: string, data: any }) {
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
    }

    private async handleUpdatePath(socket: Socket, payload: { boardId: number, pathId: string, data: any }) {
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
    }

    private async handleDisconnect(socket: Socket) {
        if (this.currentBoardId === null) {
            return;
        }
        const boardUsers = this.boardUsers.get(this.currentBoardId);
        if (boardUsers) {
            boardUsers.delete(socket.id);
        }

        const board = await this.boardRepository.findOne({
            where: { id: this.currentBoardId },
            relations: ["team"],
        });
        if (!board) {
            console.log(`Board ${this.currentBoardId} not found`);
            return;
        }
        const presentation = board.presentation as Presentation;

        if (presentation && presentation.user != undefined && presentation.user.id === (socket.request as any).user.id) {
            this.handleEndPresentation(socket);

        }
        else
            this.handleLeavePresentation(socket, this.currentBoardId);

        socket.to(`board:${this.currentBoardId}`).emit("user-left", socket.id);
    }


    private async isUserInTeam(userId: number, teamId: number): Promise<boolean> {
        const userTeam = await this.userTeamRepository.findOne({
            where: { user: { id: userId }, team: { id: teamId } },
        });
        return !!userTeam;
    }
}