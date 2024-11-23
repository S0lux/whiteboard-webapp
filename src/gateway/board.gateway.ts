import { OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Board } from "src/boards/entities/board.entity";
import { UserBoard } from "src/boards/entities/user_board.entity";
import { Path } from "src/paths/entities/path.entity";
import { Shape } from "src/shapes/entities/shape.entity";
import { Permission } from "src/shared/enums/permission.enum";
import { LoggedInUser, Presentation, StageConfig, UserJoinedPayload } from "src/shared/types/board-socket.type";
import { Team } from "src/teams/entities/team.entity";
import { UserTeam } from "src/teams/entities/user-team-relation.entity";
import { Repository } from "typeorm";

export interface PresentationState {
    presenter: LoggedInUser | null;
    presentation: StageConfig | null;
    participants: Map<string, LoggedInUser>;
}

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
    presentationStates = new Map<number, PresentationState>();

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

                socket.on("start-presentation", async (payload: { boardId: number, data: StageConfig }) => {
                    await this.handleStartPresentation(socket, payload.boardId, user, payload.data);
                });

                socket.on("join-presentation", async (boardId: number) => {
                    await this.handleJoinPresentation(socket, user, boardId);
                });

                socket.on("leave-presentation", async (boardId: number) => {
                    await this.handleLeavePresentation(socket, boardId, user);
                });

                socket.on("end-presentation", async (boardId: number) => {
                    await this.handleEndPresentation(socket, boardId);
                });

                socket.on("drag-while-presenting", async (payload: { boardId: number, data: StageConfig }) => {
                    await this.handleDragWhilePresentation(socket, payload.boardId, payload.data);
                });

                socket.on("update-user-permission", async (payload: { boardId: number, userId: number, permission: Permission }) => {
                    await this.updateUserPermission(socket, payload);
                }
                );

                socket.on("disconnect", async () => {
                    await this.handleDisconnect(socket);
                });
            }
            else {
                socket.disconnect()
                console.log("User not found");
                return;
            }
        });
    }

    private async updateUserPermission(socket: Socket, payload: { boardId: number, userId: number, permission: Permission }) {
        let userBoard = await this.userBoardRepository.findOne({
            where: { board: { id: payload.boardId }, user: { id: payload.userId } }
        });
        if (!userBoard) {
            throw new Error("User is not a member of this board");
        }
        userBoard.permission = payload.permission;
        await this.userBoardRepository.save(userBoard);
        const rawUsersBoard = await this.userBoardRepository.find({
            where: { board: { id: payload.boardId } }, relations: ["user"]
        });
        const usersBoard = rawUsersBoard.map(userBoard => {
            return {
                user: userBoard.user,
                data: userBoard.data,
                permission: userBoard.permission
            }
        });
        socket.to(`board:${payload.boardId}`).emit("users-board", usersBoard);
        socket.emit("users-board", usersBoard);
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
        // Remove user from boardUsers map
        const boardUsers = this.boardUsers.get(this.currentBoardId);
        const disconnectedUser = boardUsers?.get(socket.id);
        if (boardUsers) {
            boardUsers.delete(socket.id);
        }
        const boardId = this.currentBoardId;
        const presentationState = this.presentationStates.get(boardId);
        if (presentationState) {
            // Check if the user is the presenter
            if (presentationState.presenter?.id === disconnectedUser?.id) {
                console.log(`Presenter ${disconnectedUser?.id} disconnected from board ${boardId}`);

                // await this.handleEndPresentation(socket, boardId);
            } else {
                // Remove participant from the presentation
                presentationState.participants.delete(socket.id);

                // Notify other participants about the user leaving
                // await this.handleLeavePresentation(socket, boardId, disconnectedUser!);
            }
        }

        socket.to(`board:${this.currentBoardId}`).emit("user-left", socket.id);
    }


    private async isUserInTeam(userId: number, teamId: number): Promise<boolean> {
        const userTeam = await this.userTeamRepository.findOne({
            where: { user: { id: userId }, team: { id: teamId } },
        });
        return !!userTeam;
    }


    //Presentation
    private createPresentationState(): PresentationState {
        return {
            presenter: null,
            presentation: null,
            participants: new Map<string, LoggedInUser>()
        };
    }

    private getPresentationState(boardId: number): PresentationState {
        if (!this.presentationStates.has(boardId)) {
            this.presentationStates.set(boardId, this.createPresentationState());
        }
        return this.presentationStates.get(boardId)!;
    }

    private async validateBoardAccess(boardId: number, userId: number): Promise<{ board: Board; userTeam: UserTeam } | null> {
        const board = await this.boardRepository.findOne({
            where: { id: boardId },
            relations: ["team"],
        });

        if (!board) {
            return null;
        }

        const userTeam = await this.userTeamRepository.findOne({
            where: {
                user: { id: userId },
                team: { id: board.team.id }
            },
        });

        if (!userTeam) {
            return null;
        }

        return { board, userTeam };
    }

    private async handleStartPresentation(socket: Socket, boardId: number, user: LoggedInUser, data: StageConfig) {
        const validation = await this.validateBoardAccess(boardId, user.id);
        if (!validation) {
            socket.emit("error", { message: "Unauthorized access or board not found" });
            return;
        }

        const { board } = validation;
        const presentationState = this.getPresentationState(boardId);

        if (presentationState.presenter) {
            socket.emit("error", { message: "Presentation already in progress" });
            return;
        }

        presentationState.presenter = user;
        presentationState.presentation = data;


        socket.join(`board-presentation:${boardId}`);
        // Save presentation state to database
        board.setPresentationState(presentationState)
        await this.boardRepository.save(board);

        // Notify all users in the board
        socket.to(`board:${boardId}`).emit("start-presentation", presentationState);
    }

    private async handleJoinPresentation(socket: Socket, user: LoggedInUser, boardId: number) {
        const validation = await this.validateBoardAccess(boardId, user.id);
        if (!validation) {
            socket.emit("error", { message: "Unauthorized access or board not found" });
            return;
        }

        const { userTeam, board } = validation;
        const presentationState = this.getPresentationState(boardId);

        if (!presentationState.presentation) {
            socket.emit("error", { message: "No active presentation" });
            return;
        }

        const enhancedUser: LoggedInUser = {
            ...user,
            permission: userTeam.permission
        };

        socket.join(`board-presentation:${boardId}`);
        presentationState.participants.set(socket.id, enhancedUser);

        console.log(`User ${user.username} joined presentation for board ${boardId}`);
        board.setPresentationState(presentationState);
        await this.boardRepository.save(board);

        const participantsArray = Array.from(presentationState.participants.entries()).map(([socketId, user]) => ({
            socketId,
            enhancedUser: user,
        }));

        // Notify others about the new participant
        socket.to(`board:${boardId}`).emit("presentation-users", participantsArray);
        socket.emit("presentation-users", participantsArray);

    }

    private async handleLeavePresentation(socket: Socket, boardId: number, user: LoggedInUser) {
        const validation = await this.validateBoardAccess(boardId, user.id);
        if (!validation) {
            socket.emit("error", { message: "Unauthorized access or board not found" });
            return;
        }

        const { board } = validation;
        const presentationState = this.getPresentationState(boardId);
        const leavingUser = presentationState.participants.get(socket.id);

        if (!leavingUser) {
            socket.emit("error", { message: "User not in the presentation" });
            return;
        }

        presentationState.participants.delete(socket.id);
        console.log("After delete", presentationState.participants);
        board.setPresentationState(presentationState);
        await this.boardRepository.save(board);
        console.log(`User ${leavingUser.username} left presentation for board ${boardId}`);
        const participantsArray = Array.from(presentationState.participants.entries()).map(([socketId, user]) => ({
            socketId,
            enhancedUser: user,
        }));
        socket.to(`board:${boardId}`).emit("leave-presentation", participantsArray);
        socket.to(`board-presentation:${boardId}`).emit("leave-presentation", participantsArray);
        socket.emit("leave-presentation", participantsArray);
        socket.leave(`board-presentation:${boardId}`);


    }

    private async handleEndPresentation(socket: Socket, boardId: number) {
        const presentationState = this.getPresentationState(boardId);
        const board = await this.boardRepository.findOne({
            where: { id: boardId },
            relations: ["team"],
        });

        if (!board) {
            return;
        }

        // Clear presentation state
        board.presentation = null;
        await this.boardRepository.save(board);

        socket.leave(`board-presentation:${boardId}`)

        // Notify all participants
        socket.to(`board-presentation:${boardId}`).emit("end-presentation");
        socket.to(`board:${boardId}`).emit("end-presentation");

        console.log(`Presentation ended for board ${boardId} by ${presentationState.presenter?.id}`);
        // Clear presentation state
        this.presentationStates.set(boardId, this.createPresentationState());

    }

    private async handleDragWhilePresentation(socket: Socket, boardId: number, data: StageConfig) {
        const presentationState = this.getPresentationState(boardId);
        const user = presentationState.participants.get(socket.id);

        // if (user || user.id !== presentationState.presenter?.id) {
        //     socket.emit("error", { message: "Only the presenter can control the presentation" });
        //     return;
        // }

        presentationState.presentation = data;

        // Save state to database
        const board = await this.boardRepository.findOne({ where: { id: boardId } });
        if (board) {
            board.setPresentationState(presentationState);
            await this.boardRepository.save(board);
        }

        console.log(`Presenter ${socket.id} dragged while presenting for board ${boardId}`);

        // Broadcast to all participants
        socket.to(`board-presentation:${boardId}`).emit("drag-while-presenting", data);
    }
}