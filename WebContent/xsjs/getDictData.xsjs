/**
 *********************************************
 * Возвращает полную инфу о варианте расчета *
 *********************************************
 *
 * @param GET запрос
 * Принимает параметры:
 *      id             - id карточки
 *      version        - версия
 *
 * @return В случае успеха возвращается статус 200
 *
 * @author Domozhakov_MV@surgutneftegas.ru
 * @author Talipov_MI@surgutneftegas.ru
 */


var conn = $.db.getConnection();
try {
    getCardData();
} catch (e) {
    $.response.setBody(e.toString());
    $.response.status = $.net.http.INTERNAL_SERVER_ERROR;
}


function getCardData()
{
    let iId = parseInt($.request.parameters.get("id_card"));
    let iVersion = parseInt($.request.parameters.get("version"));

    let pstmt = conn.prepareStatement(
        "SELECT D.ID_DICTIONARY, D.VERSION, D.NAME_DICTIONARY, D.DESCRIPTION, D.OWNER_DEPARTMENT_ID, " +
        "D.ORIGIN_SYSTEM, D.RESPONSIBLE_SERVICE_ID, D.RESPONSIBLE_PERSON, D.NAME_VIEW, D.IS_TEMPORARY_DEPEND, I.CODE_VALUE " +
        "FROM Z_BOBJ_REPO.T_DICTIONARY as D " +
        "left outer join Z_BOBJ_REPO.T_IAS as I "+
        "on D.IAS_ID = I.ID_IAS " +
        "WHERE D.ID_DICTIONARY = ? and D.VERSION = ?"
    );
    pstmt.setBigInt(1, iId);
    pstmt.setInteger(2, iVersion);
    let rs = pstmt.executeQuery();
    rs.next();

    let data = {
        "id": rs.getInteger(1),
        "version": rs.getInteger(2),
        "name": rs.getNString(3),
        "description": rs.getNString(4),
        "ownerDepartment": rs.getInteger(5),
        "originSystem": rs.getNString(6),
        "responsibleService": rs.getInteger(7),
        "responsiblePerson": rs.getNString(8),
        "sViewName": rs.getNString(9),
        "isTempDepend": rs.getNString(10),
        "iasCodeValue": rs.getNString(11)
    };

    $.response.setBody(JSON.stringify(data));
    $.response.contentType = 'application/json';
    $.response.status = $.net.http.OK;
}
