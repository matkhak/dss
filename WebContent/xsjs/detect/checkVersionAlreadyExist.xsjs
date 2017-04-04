/**
 * ********************************************
 Проверка на то, что такя версия уже есть
 * ********************************************
 *
 * @param GET запрос Принимает параметры: id - id карточки version - версия
 *
 * @return В случае успеха возвращается статус 200
 *
 * @author Domozhakov_MV@surgutneftegas.ru
 */

var conn = $.db.getConnection();
try {

    var ID_CARD = parseInt($.request.parameters.get("ID_CARD"));
    var VERSION = parseInt($.request.parameters.get("VERSION"));

    checkVersionAlreadyExist(ID_CARD, VERSION);
} catch (e) {
    $.response.setBody(e.toString());
    $.response.status = $.net.http.INTERNAL_SERVER_ERROR;
}

function checkVersionAlreadyExist(id, version) {
    let
    pstmt = conn.prepareStatement("select max(AUTHOR) "
            + "from Z_BOBJ_REPO.T_HISTORY_STATUS " + "where id_object = ? "
            + "and version = ? ");
    pstmt.setBigInt(1, id);
    pstmt.setInteger(2, version+1);
    let
    result = pstmt.executeQuery();

    if (result.next()) {
        let
        author = result.getNString(1);
        if (author) {
            // fixme: надо бы отдавать какой-нибудь объект с нужными данными, а
            // конкретный текст писать уже на клиенте
            throw "Неутверждённая карточка с версией " + version
                    + " уже создана пользователем " + author
        }
    }
}
